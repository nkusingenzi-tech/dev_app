package com.freeman.mvp.contentblocker

import android.net.VpnService
import android.util.Log
import com.freeman.mvp.BuildConfig
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicBoolean

class DnsPacketHandler(
  private val vpnService: VpnService,
  private val inputStream: FileInputStream,
  private val outputStream: FileOutputStream,
  private val upstreamDnsServers: List<InetAddress>,
  private val running: AtomicBoolean
) : Runnable {
  private val diagnosticCount = AtomicInteger(0)

  override fun run() {
    Log.i(TAG, "DNS packet handler started")
    val buffer = ByteArray(32767)

    while (running.get()) {
      try {
        val length = inputStream.read(buffer)
        if (length <= 0) continue

        val packetBytes = buffer.copyOf(length)
        val dnsPacket = IpPacket.parseUdpDnsPacket(packetBytes, length)
        if (dnsPacket == null) {
          logUnparsedPacket(packetBytes, length)
          continue
        }
        val domain = DnsPacketParser.extractQueryDomain(dnsPacket.dnsPayload) ?: continue

        if (Blocklist.isBlocked(domain)) {
          if (BuildConfig.DEBUG) {
            Log.i(TAG, "Blocked DNS query")
          }
          val blockedResponse = DnsPacketParser.buildBlockedResponse(dnsPacket.dnsPayload)
          if (blockedResponse != null) {
            val responsePacket = IpPacket.buildUdpResponsePacket(dnsPacket, blockedResponse)
            outputStream.write(responsePacket)
          }
          continue
        }

        val response = forwardDnsQuery(dnsPacket.dnsPayload, dnsPacket.destinationAddress)
        if (response != null) {
          val responsePacket = IpPacket.buildUdpResponsePacket(dnsPacket, response)
          outputStream.write(responsePacket)
        }
      } catch (exception: Exception) {
        if (running.get()) {
          Log.w(TAG, "DNS packet loop error", exception)
        }
      }
    }
  }

  private fun logUnparsedPacket(packet: ByteArray, length: Int) {
    if (!BuildConfig.DEBUG) return
    if (diagnosticCount.incrementAndGet() > MAX_DIAGNOSTIC_LOGS || length < 1) return
    val version = (packet[0].toInt() ushr 4) and 0x0F
    val protocol = if (length > 9) packet[9].toInt() and 0xFF else -1
    val headerLength = if (version == 4) (packet[0].toInt() and 0x0F) * 4 else 0
    val ports = if (version == 4 && headerLength >= 20 && length >= headerLength + 4) {
      val sourcePort = ((packet[headerLength].toInt() and 0xFF) shl 8) or (packet[headerLength + 1].toInt() and 0xFF)
      val destinationPort = ((packet[headerLength + 2].toInt() and 0xFF) shl 8) or (packet[headerLength + 3].toInt() and 0xFF)
      " sourcePort=$sourcePort destinationPort=$destinationPort"
    } else {
      ""
    }
    Log.i(TAG, "Unparsed VPN packet length=$length version=$version protocol=$protocol$ports")
  }

  private fun forwardDnsQuery(queryPayload: ByteArray, destinationAddress: InetAddress): ByteArray? {
    val upstream = when {
      upstreamDnsServers.any { it == destinationAddress } -> destinationAddress
      upstreamDnsServers.isNotEmpty() -> upstreamDnsServers.first()
      else -> return null
    }

    DatagramSocket().use { socket ->
      vpnService.protect(socket)
      socket.soTimeout = DNS_TIMEOUT_MS
      val request = DatagramPacket(queryPayload, queryPayload.size, upstream, DNS_PORT)
      socket.send(request)

      val responseBuffer = ByteArray(4096)
      val response = DatagramPacket(responseBuffer, responseBuffer.size)
      socket.receive(response)
      return response.data.copyOf(response.length)
    }
  }

  companion object {
    private const val TAG = "FreemanDnsFilter"
    private const val DNS_PORT = 53
    private const val DNS_TIMEOUT_MS = 2500
    private const val MAX_DIAGNOSTIC_LOGS = 20
  }
}
