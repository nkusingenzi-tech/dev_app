package com.freeman.mvp.contentblocker

import android.net.VpnService
import android.util.Log
import java.io.EOFException
import java.io.InputStream
import java.io.OutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.Inet4Address
import java.net.Inet6Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketException
import java.net.SocketTimeoutException
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

class Socks5DirectProxy(
  private val vpnService: VpnService,
  private val running: AtomicBoolean
) {
  private val sessions = CopyOnWriteArrayList<Socket>()
  private var serverSocket: ServerSocket? = null
  private var serverThread: Thread? = null

  fun start() {
    serverThread = Thread({
      try {
        ServerSocket().use { server ->
          server.reuseAddress = true
          server.bind(InetSocketAddress(LOCALHOST, DEFAULT_TCP_PORT))
          serverSocket = server
          Log.i(TAG, "SOCKS5 forwarder listening on $LOCALHOST:$DEFAULT_TCP_PORT")

          while (running.get()) {
            try {
              val client = server.accept()
              sessions.add(client)
              Thread({ handleClientSafely(client) }, "FreemanSocksClient").start()
            } catch (exception: SocketException) {
              if (running.get()) Log.w(TAG, "SOCKS accept failed", exception)
            }
          }
        }
      } catch (exception: Exception) {
        if (running.get()) Log.e(TAG, "SOCKS5 forwarder stopped unexpectedly", exception)
      } finally {
        serverSocket = null
      }
    }, "FreemanSocksServer").apply { start() }
  }

  fun stop() {
    runCatching { serverSocket?.close() }
    serverSocket = null
    sessions.forEach { socket -> runCatching { socket.close() } }
    sessions.clear()
    serverThread?.interrupt()
    serverThread = null
  }

  private fun handleClientSafely(client: Socket) {
    try {
      client.tcpNoDelay = true
      handleClient(client)
    } catch (exception: Exception) {
      if (running.get() && exception !is EOFException && exception !is SocketException) {
        Log.w(TAG, "SOCKS client failed", exception)
      }
    } finally {
      sessions.remove(client)
      runCatching { client.close() }
    }
  }

  private fun handleClient(client: Socket) {
    val input = client.getInputStream()
    val output = client.getOutputStream()
    negotiateNoAuth(input, output)

    val version = input.readRequiredByte()
    if (version != SOCKS_VERSION) throw EOFException("Unsupported SOCKS version")

    val command = input.readRequiredByte()
    input.readRequiredByte()
    val address = readAddress(input)
    val port = input.readUInt16()

    when (command) {
      COMMAND_CONNECT -> relayTcp(client, output, address, port)
      COMMAND_UDP_ASSOCIATE -> relayUdp(client, output)
      else -> writeReply(output, REPLY_COMMAND_NOT_SUPPORTED, InetAddress.getByName("0.0.0.0"), 0)
    }
  }

  private fun negotiateNoAuth(input: InputStream, output: OutputStream) {
    val version = input.readRequiredByte()
    if (version != SOCKS_VERSION) throw EOFException("Unsupported SOCKS version")

    val methodCount = input.readRequiredByte()
    if (methodCount <= 0) throw EOFException("No SOCKS auth methods")
    input.readFullyExact(methodCount)

    output.write(byteArrayOf(SOCKS_VERSION.toByte(), AUTH_NONE.toByte()))
    output.flush()
  }

  private fun relayTcp(client: Socket, output: OutputStream, host: String, port: Int) {
    val remote = Socket()
    vpnService.protect(remote)
    var successSent = false
    try {
      if (Blocklist.isBlocked(host)) {
        Log.i(TAG, "Blocked CONNECT target for $host")
        writeReply(output, REPLY_CONNECTION_REFUSED, InetAddress.getByName("0.0.0.0"), 0)
        return
      }

      remote.tcpNoDelay = true
      remote.connect(InetSocketAddress(host, port), CONNECT_TIMEOUT_MS)
      writeReply(output, REPLY_SUCCESS, InetAddress.getByName("0.0.0.0"), 0)
      successSent = true

      val preview = if (port == HTTPS_PORT) {
        sniffTlsClientHello(client)
      } else {
        ClientHelloPreview(ByteArray(0), null)
      }
      if (preview.blockedHost != null) {
        Log.i(TAG, "Blocked TLS SNI host for ${preview.blockedHost}")
        runCatching { remote.close() }
        runCatching { client.close() }
        return
      }
      if (preview.prefix.isNotEmpty()) {
        val remoteOutput = remote.getOutputStream()
        remoteOutput.write(preview.prefix)
        remoteOutput.flush()
      }

      val upstream = Thread({
        relayBetweenSockets(client, remote)
      }, "FreemanTcpUp")
      val downstream = Thread({
        relayBetweenSockets(remote, client)
      }, "FreemanTcpDown")
      upstream.start()
      downstream.start()
      upstream.join()
      downstream.join()
    } catch (exception: Exception) {
      if (!successSent) {
        runCatching { writeReply(output, REPLY_GENERAL_FAILURE, InetAddress.getByName("0.0.0.0"), 0) }
      }
      runCatching { remote.close() }
      throw exception
    } finally {
      runCatching { remote.close() }
    }
  }

  private fun sniffTlsClientHello(client: Socket): ClientHelloPreview {
    val previousTimeout = client.soTimeout
    client.soTimeout = TLS_SNI_READ_TIMEOUT_MS
    try {
      val input = client.getInputStream()
      val firstRecordHeader = ByteArray(TLS_RECORD_HEADER_SIZE)
      val headerBytesRead = input.readAtMost(firstRecordHeader, firstRecordHeader.size)
      if (headerBytesRead < firstRecordHeader.size) {
        return ClientHelloPreview(firstRecordHeader.copyOf(headerBytesRead), null)
      }

      val contentType = firstRecordHeader[0].toInt() and 0xFF
      if (contentType != TLS_HANDSHAKE_CONTENT_TYPE) {
        return ClientHelloPreview(firstRecordHeader, null)
      }

      val recordLength = readUInt16(firstRecordHeader, 3)
      if (recordLength <= 0 || recordLength > MAX_TLS_RECORD_SIZE) {
        return ClientHelloPreview(firstRecordHeader, null)
      }

      val payload = ByteArray(recordLength)
      val payloadBytesRead = input.readAtMost(payload, payload.size)
      if (payloadBytesRead < payload.size) {
        val prefix = ByteArray(firstRecordHeader.size + payloadBytesRead)
        System.arraycopy(firstRecordHeader, 0, prefix, 0, firstRecordHeader.size)
        System.arraycopy(payload, 0, prefix, firstRecordHeader.size, payloadBytesRead)
        return ClientHelloPreview(prefix, null)
      }

      val record = ByteArray(firstRecordHeader.size + payload.size)
      System.arraycopy(firstRecordHeader, 0, record, 0, firstRecordHeader.size)
      System.arraycopy(payload, 0, record, firstRecordHeader.size, payload.size)

      val serverName = TlsClientHelloParser.extractServerName(record)
      return if (serverName != null && Blocklist.isBlocked(serverName)) {
        ClientHelloPreview(record, serverName)
      } else {
        ClientHelloPreview(record, null)
      }
    } finally {
      client.soTimeout = previousTimeout
    }
  }

  private fun relayUdp(controlSocket: Socket, output: OutputStream) {
    DatagramSocket(0).use { relay ->
      vpnService.protect(relay)
      relay.soTimeout = UDP_POLL_TIMEOUT_MS
      writeReply(output, REPLY_SUCCESS, InetAddress.getByName(LOCALHOST), relay.localPort)

      val clientAddress = arrayOfNulls<InetSocketAddress>(1)
      val udpThread = Thread({
        relayUdpLoop(relay, clientAddress)
      }, "FreemanUdpRelay").apply { start() }

      try {
        val buffer = ByteArray(1)
        while (running.get() && !controlSocket.isClosed) {
          if (controlSocket.getInputStream().read(buffer) < 0) break
        }
      } catch (_: Exception) {
      } finally {
        relay.close()
        udpThread.interrupt()
      }
    }
  }

  private fun relayUdpLoop(relay: DatagramSocket, clientAddress: Array<InetSocketAddress?>) {
    val buffer = ByteArray(MAX_UDP_PACKET_SIZE)
    while (running.get() && !relay.isClosed) {
      try {
        val packet = DatagramPacket(buffer, buffer.size)
        relay.receive(packet)
        val sender = packet.socketAddress as? InetSocketAddress ?: continue
        val knownClient = clientAddress[0]

        if (knownClient == null || sender == knownClient) {
          val frame = parseUdpFrame(packet.data, packet.offset, packet.length) ?: continue
          clientAddress[0] = sender
          val blockedResponse = buildBlockedDnsUdpFrame(frame)
          if (blockedResponse != null) {
            relay.send(DatagramPacket(blockedResponse, blockedResponse.size, sender))
            continue
          }
          relay.send(DatagramPacket(frame.payload, frame.payload.size, InetSocketAddress(frame.host, frame.port)))
        } else {
          val client = knownClient ?: continue
          val response = buildUdpFrame(packet.address, packet.port, packet.data.copyOfRange(packet.offset, packet.offset + packet.length))
          relay.send(DatagramPacket(response, response.size, client))
        }
      } catch (_: SocketTimeoutException) {
      } catch (_: SocketException) {
        break
      } catch (exception: Exception) {
        if (running.get()) Log.w(TAG, "UDP relay packet failed", exception)
      }
    }
  }

  private fun parseUdpFrame(data: ByteArray, offset: Int, length: Int): UdpFrame? {
    if (length < 10) return null
    var cursor = offset
    val end = offset + length
    if (data[cursor].toInt() != 0 || data[cursor + 1].toInt() != 0) return null
    cursor += 2
    val fragment = data[cursor++].toInt() and 0xFF
    if (fragment != 0) return null

    val address = readAddress(data, cursor, end) ?: return null
    cursor = address.nextOffset
    if (cursor + 2 > end) return null
    val port = readUInt16(data, cursor)
    cursor += 2
    if (cursor > end) return null

    return UdpFrame(address.host, port, data.copyOfRange(cursor, end))
  }

  private fun buildBlockedDnsUdpFrame(frame: UdpFrame): ByteArray? {
    if (frame.port != DNS_PORT) return null

    val domain = DnsPacketParser.extractQueryDomain(frame.payload) ?: return null
    if (!Blocklist.isBlocked(domain)) return null

    val responsePayload = DnsPacketParser.buildBlockedResponse(frame.payload) ?: return null
    val dnsServerAddress = runCatching { InetAddress.getByName(frame.host) }.getOrNull() ?: InetAddress.getByName("0.0.0.0")
    Log.i(TAG, "Blocked DNS query for $domain")
    return buildUdpFrame(dnsServerAddress, DNS_PORT, responsePayload)
  }

  private fun readAddress(input: InputStream): String {
    return when (val type = input.readRequiredByte()) {
      ADDRESS_IPV4 -> InetAddress.getByAddress(input.readFullyExact(4)).hostAddress ?: throw EOFException("Invalid IPv4")
      ADDRESS_DOMAIN -> {
        val size = input.readRequiredByte()
        input.readFullyExact(size).toString(Charsets.UTF_8)
      }
      ADDRESS_IPV6 -> InetAddress.getByAddress(input.readFullyExact(16)).hostAddress ?: throw EOFException("Invalid IPv6")
      else -> throw EOFException("Unsupported address type $type")
    }
  }

  private fun readAddress(data: ByteArray, offset: Int, end: Int): ParsedAddress? {
    if (offset >= end) return null
    var cursor = offset
    return when (val type = data[cursor++].toInt() and 0xFF) {
      ADDRESS_IPV4 -> {
        if (cursor + 4 > end) return null
        ParsedAddress(InetAddress.getByAddress(data.copyOfRange(cursor, cursor + 4)).hostAddress ?: return null, cursor + 4)
      }
      ADDRESS_DOMAIN -> {
        if (cursor >= end) return null
        val size = data[cursor++].toInt() and 0xFF
        if (cursor + size > end) return null
        ParsedAddress(data.copyOfRange(cursor, cursor + size).toString(Charsets.UTF_8), cursor + size)
      }
      ADDRESS_IPV6 -> {
        if (cursor + 16 > end) return null
        ParsedAddress(InetAddress.getByAddress(data.copyOfRange(cursor, cursor + 16)).hostAddress ?: return null, cursor + 16)
      }
      else -> {
        Log.d(TAG, "Unsupported UDP address type $type")
        null
      }
    }
  }

  private fun writeReply(output: OutputStream, status: Int, address: InetAddress, port: Int) {
    val addressBytes = when (address) {
      is Inet4Address -> address.address
      is Inet6Address -> address.address
      else -> InetAddress.getByName("0.0.0.0").address
    }
    val addressType = if (addressBytes.size == 16) ADDRESS_IPV6 else ADDRESS_IPV4
    output.write(byteArrayOf(SOCKS_VERSION.toByte(), status.toByte(), 0, addressType.toByte()))
    output.write(addressBytes)
    output.write(byteArrayOf(((port ushr 8) and 0xFF).toByte(), (port and 0xFF).toByte()))
    output.flush()
  }

  private fun buildUdpFrame(address: InetAddress, port: Int, payload: ByteArray): ByteArray {
    val addressBytes = address.address
    val addressType = if (addressBytes.size == 16) ADDRESS_IPV6 else ADDRESS_IPV4
    val frame = ByteArray(3 + 1 + addressBytes.size + 2 + payload.size)
    var cursor = 0
    frame[cursor++] = 0
    frame[cursor++] = 0
    frame[cursor++] = 0
    frame[cursor++] = addressType.toByte()
    System.arraycopy(addressBytes, 0, frame, cursor, addressBytes.size)
    cursor += addressBytes.size
    frame[cursor++] = ((port ushr 8) and 0xFF).toByte()
    frame[cursor++] = (port and 0xFF).toByte()
    System.arraycopy(payload, 0, frame, cursor, payload.size)
    return frame
  }

  private data class ParsedAddress(val host: String, val nextOffset: Int)
  private data class UdpFrame(val host: String, val port: Int, val payload: ByteArray)
  private data class ClientHelloPreview(val prefix: ByteArray, val blockedHost: String?)

  companion object {
    const val DEFAULT_TCP_PORT = 10808
    private const val TAG = "FreemanSocks5"
    private const val LOCALHOST = "127.0.0.1"
    private const val SOCKS_VERSION = 5
    private const val AUTH_NONE = 0
    private const val COMMAND_CONNECT = 1
    private const val COMMAND_UDP_ASSOCIATE = 3
    private const val REPLY_SUCCESS = 0
    private const val REPLY_GENERAL_FAILURE = 1
    private const val REPLY_CONNECTION_REFUSED = 5
    private const val REPLY_COMMAND_NOT_SUPPORTED = 7
    private const val ADDRESS_IPV4 = 1
    private const val ADDRESS_DOMAIN = 3
    private const val ADDRESS_IPV6 = 4
    private const val DNS_PORT = 53
    private const val HTTPS_PORT = 443
    private const val TLS_RECORD_HEADER_SIZE = 5
    private const val TLS_HANDSHAKE_CONTENT_TYPE = 22
    private const val MAX_TLS_RECORD_SIZE = 16 * 1024
    private const val TLS_SNI_READ_TIMEOUT_MS = 350
    private const val CONNECT_TIMEOUT_MS = 10_000
    private const val UDP_POLL_TIMEOUT_MS = 1_000
    private const val MAX_UDP_PACKET_SIZE = 65_535
  }
}

private fun InputStream.readRequiredByte(): Int {
  val value = read()
  if (value < 0) throw EOFException("Unexpected end of stream")
  return value and 0xFF
}

private fun InputStream.readUInt16(): Int {
  val high = readRequiredByte()
  val low = readRequiredByte()
  return (high shl 8) or low
}

private fun InputStream.readFullyExact(size: Int): ByteArray {
  val data = ByteArray(size)
  var offset = 0
  while (offset < size) {
    val read = read(data, offset, size - offset)
    if (read < 0) throw EOFException("Unexpected end of stream")
    offset += read
  }
  return data
}

private fun InputStream.readExactInto(buffer: ByteArray, offset: Int, size: Int): Boolean {
  var cursor = 0
  while (cursor < size) {
    val read = read(buffer, offset + cursor, size - cursor)
    if (read < 0) return false
    cursor += read
  }
  return true
}

private fun InputStream.readAtMost(buffer: ByteArray, size: Int): Int {
  var cursor = 0
  while (cursor < size) {
    val read = try {
      read(buffer, cursor, size - cursor)
    } catch (_: SocketTimeoutException) {
      break
    }
    if (read < 0) break
    cursor += read
  }
  return cursor
}

private fun relayBetweenSockets(inputSocket: Socket, outputSocket: Socket) {
  val buffer = ByteArray(16 * 1024)
  try {
    val input = inputSocket.getInputStream()
    val output = outputSocket.getOutputStream()
    while (true) {
      val read = input.read(buffer)
      if (read < 0) break
      output.write(buffer, 0, read)
      output.flush()
    }
  } catch (_: Exception) {
  } finally {
    runCatching { inputSocket.close() }
    runCatching { outputSocket.close() }
  }
}

private fun readUInt16(data: ByteArray, offset: Int): Int {
  return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
}
