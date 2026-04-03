package com.steadypath.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.IBinder
import android.os.ParcelFileDescriptor
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class ContentFilterVpnService : VpnService() {
  private var vpnInterface: ParcelFileDescriptor? = null
  private val serviceRunning = AtomicBoolean(false)
  private var packetLoopThread: Thread? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    createNotificationChannel()
    startForeground(NOTIFICATION_ID, buildNotification())

    if (vpnInterface == null) {
      vpnInterface =
        Builder()
          .setSession("Steady Path Content Filter")
          .setMtu(1500)
          .addAddress(VPN_INTERFACE_ADDRESS, 32)
          .addDnsServer(VPN_DNS_ADDRESS)
          .addRoute(VPN_DNS_ADDRESS, 32)
          .establish()
    }

    ContentFilterPrefs.markVpnPermissionGranted(applicationContext, true)
    ContentFilterPrefs.markServiceRunning(applicationContext, true)
    ContentFilterPrefs.resetRuntimeStats(applicationContext)
    startPacketLoopIfNeeded()
    return START_STICKY
  }

  override fun onDestroy() {
    serviceRunning.set(false)
    packetLoopThread?.interrupt()
    packetLoopThread = null
    vpnInterface?.close()
    vpnInterface = null
    ContentFilterPrefs.markServiceRunning(applicationContext, false)
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? {
    return super.onBind(intent)
  }

  private fun startPacketLoopIfNeeded() {
    if (serviceRunning.get()) {
      return
    }

    val currentInterface = vpnInterface ?: return
    serviceRunning.set(true)
    packetLoopThread =
      Thread(
        {
          runDnsProxyLoop(currentInterface)
        },
        "steady-path-dns-proxy",
      ).apply {
        isDaemon = true
        start()
      }
  }

  private fun runDnsProxyLoop(descriptor: ParcelFileDescriptor) {
    val input = FileInputStream(descriptor.fileDescriptor)
    val output = FileOutputStream(descriptor.fileDescriptor)
    val packetBuffer = ByteArray(MAX_PACKET_BYTES)

    try {
      while (serviceRunning.get()) {
        val packetLength =
          try {
            input.read(packetBuffer)
          } catch (_: Exception) {
            break
          }

        if (packetLength <= 0) {
          continue
        }

        val packet = packetBuffer.copyOf(packetLength)
        val request = DnsPacketParser.parse(packet) ?: continue
        val config = ContentFilterPrefs.readConfig(applicationContext)
        val domain = request.question.domain.lowercase(Locale.US)
        val responsePayload =
          if (config.enabled && DomainPolicy.shouldBlockDomain(domain, config.blockedCategories, config.strictMode)) {
            ContentFilterPrefs.recordBlockedDomain(applicationContext, domain)
            DnsResponseFactory.buildBlockedResponse(request.dnsPayload, request.questionEndOffset)
          } else {
            forwardDnsQuery(
              dnsPayload = request.dnsPayload,
              upstreamServers = DomainPolicy.upstreamResolvers(config.safeSearch, config.strictMode, config.blockedCategories),
            )
          }

        if (responsePayload != null) {
          val responsePacket = request.buildResponsePacket(responsePayload)
          output.write(responsePacket)
          output.flush()
        }
      }
    } finally {
      serviceRunning.set(false)
      ContentFilterPrefs.markServiceRunning(applicationContext, false)
      try {
        input.close()
      } catch (_: Exception) {
      }
      try {
        output.close()
      } catch (_: Exception) {
      }
    }
  }

  private fun forwardDnsQuery(dnsPayload: ByteArray, upstreamServers: List<InetAddress>): ByteArray? {
    for (resolver in upstreamServers) {
      val socket = DatagramSocket()
      try {
        protect(socket)
        socket.soTimeout = DNS_TIMEOUT_MS
        val outboundPacket = DatagramPacket(dnsPayload, dnsPayload.size, resolver, DNS_PORT)
        socket.send(outboundPacket)

        val responseBuffer = ByteArray(MAX_DNS_PAYLOAD_BYTES)
        val inboundPacket = DatagramPacket(responseBuffer, responseBuffer.size)
        socket.receive(inboundPacket)
        return inboundPacket.data.copyOf(inboundPacket.length)
      } catch (_: SocketTimeoutException) {
        // Try the next resolver.
      } catch (_: Exception) {
        // Try the next resolver.
      } finally {
        socket.close()
      }
    }

    return null
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Content filter",
      NotificationManager.IMPORTANCE_LOW,
    )
    manager.createNotificationChannel(channel)
  }

  private fun buildNotification(): Notification {
    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(this, CHANNEL_ID)
      } else {
        Notification.Builder(this)
      }

    return builder
      .setContentTitle("Steady Path filter active")
      .setContentText("DNS filtering is running across the phone.")
      .setSmallIcon(android.R.drawable.ic_lock_lock)
      .setOngoing(true)
      .build()
  }

  companion object {
    private const val CHANNEL_ID = "steady_path_content_filter"
    private const val NOTIFICATION_ID = 4101
    private const val MAX_PACKET_BYTES = 32767
    private const val MAX_DNS_PAYLOAD_BYTES = 4096
    private const val DNS_PORT = 53
    private const val DNS_TIMEOUT_MS = 2500
    private const val VPN_INTERFACE_ADDRESS = "10.8.0.2"
    private const val VPN_DNS_ADDRESS = "10.8.0.1"
  }
}

private object DomainPolicy {
  private val adultDomains =
    setOf(
      "pornhub.com",
      "xvideos.com",
      "xnxx.com",
      "redtube.com",
      "youporn.com",
      "xhamster.com",
      "chaturbate.com",
      "stripchat.com",
      "onlyfans.com",
      "nhentai.net",
      "rule34.xxx",
    )

  private val socialDomains =
    setOf(
      "instagram.com",
      "cdninstagram.com",
      "facebook.com",
      "fbcdn.net",
      "tiktok.com",
      "tiktokv.com",
      "byteoversea.com",
      "youtube.com",
      "googlevideo.com",
      "snapchat.com",
    )

  private val gamblingDomains =
    setOf(
      "betway.com",
      "bet365.com",
      "1xbet.com",
      "melbet.com",
      "hollywoodbets.net",
      "stake.com",
      "betmgm.com",
      "draftkings.com",
      "fanduel.com",
      "888casino.com",
    )

  private val clickbaitDomains =
    setOf(
      "buzzfeed.com",
      "upworthy.com",
      "boredpanda.com",
      "diply.com",
      "thechive.com",
      "viralnova.com",
    )

  private val explicitSearchDomains =
    setOf(
      "google.com",
      "bing.com",
      "search.yahoo.com",
      "duckduckgo.com",
      "yahoo.com",
      "google.co.za",
      "google.co.uk",
      "google.co.in",
    )

  fun shouldBlockDomain(domain: String, categories: Set<String>, strictMode: Boolean): Boolean {
    val normalized = normalizeDomain(domain)
    val shouldBlockAdult = categories.contains("Adult content") || strictMode
    val shouldBlockExplicitSearch = categories.contains("Explicit search") && strictMode
    val shouldBlockSocial = categories.contains("Social reels")
    val shouldBlockClickbait = categories.contains("Clickbait sites")
    val shouldBlockGambling = categories.contains("Gambling")

    return (shouldBlockAdult && matchesAny(normalized, adultDomains)) ||
      (shouldBlockExplicitSearch && matchesAny(normalized, explicitSearchDomains)) ||
      (shouldBlockSocial && matchesAny(normalized, socialDomains)) ||
      (shouldBlockClickbait && matchesAny(normalized, clickbaitDomains)) ||
      (shouldBlockGambling && matchesAny(normalized, gamblingDomains))
  }

  fun upstreamResolvers(
    safeSearch: Boolean,
    strictMode: Boolean,
    categories: Set<String>,
  ): List<InetAddress> {
    val familyMode = safeSearch || strictMode || categories.contains("Adult content") || categories.contains("Explicit search")
    val resolverAddresses =
      if (familyMode) {
        listOf("1.1.1.3", "1.0.0.3")
      } else {
        listOf("1.1.1.1", "1.0.0.1")
      }

    return resolverAddresses.map(InetAddress::getByName)
  }

  private fun matchesAny(domain: String, blockedDomains: Set<String>): Boolean {
    return blockedDomains.any { candidate ->
      domain == candidate || domain.endsWith(".$candidate")
    }
  }

  private fun normalizeDomain(domain: String): String {
    return domain.trim().trimEnd('.').lowercase(Locale.US)
  }
}

private object DnsResponseFactory {
  fun buildBlockedResponse(requestPayload: ByteArray, questionEndOffset: Int): ByteArray {
    val questionSection = requestPayload.copyOfRange(DNS_HEADER_BYTES, questionEndOffset)
    val response = ByteArray(DNS_HEADER_BYTES + questionSection.size)

    response[0] = requestPayload[0]
    response[1] = requestPayload[1]
    response[2] = (requestPayload[2].toInt() or 0x80).toByte()
    response[3] = ((requestPayload[3].toInt() and 0xF0) or 0x03).toByte()
    response[4] = requestPayload[4]
    response[5] = requestPayload[5]
    response[6] = 0
    response[7] = 0
    response[8] = 0
    response[9] = 0
    response[10] = 0
    response[11] = 0
    System.arraycopy(questionSection, 0, response, DNS_HEADER_BYTES, questionSection.size)
    return response
  }

  private const val DNS_HEADER_BYTES = 12
}

private data class DnsQuestion(
  val domain: String,
)

private data class ParsedDnsPacket(
  val sourceIp: ByteArray,
  val destinationIp: ByteArray,
  val sourcePort: Int,
  val destinationPort: Int,
  val dnsPayload: ByteArray,
  val question: DnsQuestion,
  val questionEndOffset: Int,
) {
  fun buildResponsePacket(dnsResponse: ByteArray): ByteArray {
    val totalLength = IPV4_HEADER_BYTES + UDP_HEADER_BYTES + dnsResponse.size
    val packet = ByteArray(totalLength)

    packet[0] = 0x45
    packet[1] = 0
    writeShort(packet, 2, totalLength)
    writeShort(packet, 4, 0)
    writeShort(packet, 6, 0)
    packet[8] = 64
    packet[9] = 17
    writeShort(packet, 10, 0)
    System.arraycopy(destinationIp, 0, packet, 12, 4)
    System.arraycopy(sourceIp, 0, packet, 16, 4)
    val ipChecksum = computeChecksum(packet, 0, IPV4_HEADER_BYTES)
    writeShort(packet, 10, ipChecksum)

    writeShort(packet, IPV4_HEADER_BYTES, destinationPort)
    writeShort(packet, IPV4_HEADER_BYTES + 2, sourcePort)
    writeShort(packet, IPV4_HEADER_BYTES + 4, UDP_HEADER_BYTES + dnsResponse.size)
    writeShort(packet, IPV4_HEADER_BYTES + 6, 0)
    System.arraycopy(dnsResponse, 0, packet, IPV4_HEADER_BYTES + UDP_HEADER_BYTES, dnsResponse.size)
    return packet
  }

  companion object {
    private const val IPV4_HEADER_BYTES = 20
    private const val UDP_HEADER_BYTES = 8
  }
}

private object DnsPacketParser {
  fun parse(packet: ByteArray): ParsedDnsPacket? {
    if (packet.size < 28) {
      return null
    }

    val version = (packet[0].toInt() ushr 4) and 0x0F
    if (version != 4) {
      return null
    }

    val headerLength = (packet[0].toInt() and 0x0F) * 4
    if (packet.size < headerLength + 8) {
      return null
    }

    val protocol = packet[9].toInt() and 0xFF
    if (protocol != 17) {
      return null
    }

    val totalLength = readUnsignedShort(packet, 2).coerceAtMost(packet.size)
    val sourcePort = readUnsignedShort(packet, headerLength)
    val destinationPort = readUnsignedShort(packet, headerLength + 2)
    if (destinationPort != 53) {
      return null
    }

    val dnsPayloadStart = headerLength + 8
    if (totalLength <= dnsPayloadStart) {
      return null
    }

    val dnsPayload = packet.copyOfRange(dnsPayloadStart, totalLength)
    val question = parseQuestion(dnsPayload) ?: return null
    return ParsedDnsPacket(
      sourceIp = packet.copyOfRange(12, 16),
      destinationIp = packet.copyOfRange(16, 20),
      sourcePort = sourcePort,
      destinationPort = destinationPort,
      dnsPayload = dnsPayload,
      question = DnsQuestion(question.domain),
      questionEndOffset = question.questionEndOffset,
    )
  }

  private fun parseQuestion(payload: ByteArray): ParsedQuestion? {
    if (payload.size < 17) {
      return null
    }

    val questionCount = readUnsignedShort(payload, 4)
    if (questionCount < 1) {
      return null
    }

    var offset = 12
    val labels = mutableListOf<String>()

    while (offset < payload.size) {
      val labelLength = payload[offset].toInt() and 0xFF
      if (labelLength == 0) {
        offset += 1
        break
      }

      if (labelLength and 0xC0 != 0) {
        return null
      }

      val labelStart = offset + 1
      val labelEnd = labelStart + labelLength
      if (labelEnd > payload.size) {
        return null
      }

      labels.add(String(payload, labelStart, labelLength, Charsets.UTF_8))
      offset = labelEnd
    }

    if (offset + 4 > payload.size) {
      return null
    }

    return ParsedQuestion(
      domain = labels.joinToString("."),
      questionEndOffset = offset + 4,
    )
  }

  private data class ParsedQuestion(
    val domain: String,
    val questionEndOffset: Int,
  )
}

private fun readUnsignedShort(data: ByteArray, offset: Int): Int {
  return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
}

private fun writeShort(data: ByteArray, offset: Int, value: Int) {
  data[offset] = ((value ushr 8) and 0xFF).toByte()
  data[offset + 1] = (value and 0xFF).toByte()
}

private fun computeChecksum(data: ByteArray, offset: Int, length: Int): Int {
  var sum = 0L
  var index = offset

  while (index < offset + length) {
    val high = data[index].toInt() and 0xFF
    val low = if (index + 1 < offset + length) data[index + 1].toInt() and 0xFF else 0
    sum += ((high shl 8) or low).toLong()
    while (sum > 0xFFFF) {
      sum = (sum and 0xFFFF) + (sum ushr 16)
    }
    index += 2
  }

  return sum.inv().toInt() and 0xFFFF
}
