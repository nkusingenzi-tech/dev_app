package com.freeman.mvp.contentblocker

import java.net.InetAddress

data class UdpDnsPacket(
  val sourceAddress: InetAddress,
  val destinationAddress: InetAddress,
  val sourcePort: Int,
  val destinationPort: Int,
  val dnsPayload: ByteArray
)

object IpPacket {
  fun parseUdpDnsPacket(packet: ByteArray, length: Int): UdpDnsPacket? {
    if (length < 28) return null
    val version = (packet[0].toInt() ushr 4) and 0x0F
    if (version != 4) return null

    val headerLength = (packet[0].toInt() and 0x0F) * 4
    if (headerLength < 20 || length < headerLength + 8) return null

    val protocol = packet[9].toInt() and 0xFF
    if (protocol != 17) return null

    val sourceAddress = InetAddress.getByAddress(packet.copyOfRange(12, 16))
    val destinationAddress = InetAddress.getByAddress(packet.copyOfRange(16, 20))

    val udpOffset = headerLength
    val sourcePort = readUInt16(packet, udpOffset)
    val destinationPort = readUInt16(packet, udpOffset + 2)
    if (sourcePort != 53 && destinationPort != 53) return null

    val udpLength = readUInt16(packet, udpOffset + 4)
    if (udpLength < 8 || udpOffset + udpLength > length) return null

    val dnsPayload = packet.copyOfRange(udpOffset + 8, udpOffset + udpLength)
    return UdpDnsPacket(sourceAddress, destinationAddress, sourcePort, destinationPort, dnsPayload)
  }

  fun buildUdpResponsePacket(request: UdpDnsPacket, responsePayload: ByteArray): ByteArray {
    val ipHeaderLength = 20
    val udpHeaderLength = 8
    val totalLength = ipHeaderLength + udpHeaderLength + responsePayload.size
    val packet = ByteArray(totalLength)

    packet[0] = 0x45
    packet[1] = 0
    writeUInt16(packet, 2, totalLength)
    writeUInt16(packet, 4, 0)
    writeUInt16(packet, 6, 0)
    packet[8] = 64
    packet[9] = 17

    val source = request.destinationAddress.address
    val destination = request.sourceAddress.address
    System.arraycopy(source, 0, packet, 12, 4)
    System.arraycopy(destination, 0, packet, 16, 4)

    val udpOffset = ipHeaderLength
    writeUInt16(packet, udpOffset, request.destinationPort)
    writeUInt16(packet, udpOffset + 2, request.sourcePort)
    writeUInt16(packet, udpOffset + 4, udpHeaderLength + responsePayload.size)
    writeUInt16(packet, udpOffset + 6, 0)
    System.arraycopy(responsePayload, 0, packet, udpOffset + udpHeaderLength, responsePayload.size)

    writeUInt16(packet, 10, checksum(packet, 0, ipHeaderLength))
    writeUInt16(packet, udpOffset + 6, udpChecksum(packet, udpOffset, udpHeaderLength + responsePayload.size, source, destination))

    return packet
  }

  private fun udpChecksum(packet: ByteArray, udpOffset: Int, udpLength: Int, source: ByteArray, destination: ByteArray): Int {
    var sum = 0L
    sum += wordsSum(source, 0, source.size)
    sum += wordsSum(destination, 0, destination.size)
    sum += 17
    sum += udpLength
    sum += wordsSum(packet, udpOffset, udpLength)
    while ((sum ushr 16) != 0L) {
      sum = (sum and 0xFFFF) + (sum ushr 16)
    }
    val result = sum.inv().toInt() and 0xFFFF
    return if (result == 0) 0xFFFF else result
  }

  private fun checksum(data: ByteArray, offset: Int, length: Int): Int {
    var sum = wordsSum(data, offset, length)
    while ((sum ushr 16) != 0L) {
      sum = (sum and 0xFFFF) + (sum ushr 16)
    }
    return sum.inv().toInt() and 0xFFFF
  }

  private fun wordsSum(data: ByteArray, offset: Int, length: Int): Long {
    var sum = 0L
    var index = offset
    val end = offset + length
    while (index + 1 < end) {
      sum += ((data[index].toInt() and 0xFF) shl 8) or (data[index + 1].toInt() and 0xFF)
      index += 2
    }
    if (index < end) {
      sum += (data[index].toInt() and 0xFF) shl 8
    }
    return sum
  }

  private fun readUInt16(data: ByteArray, offset: Int): Int {
    return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
  }

  private fun writeUInt16(data: ByteArray, offset: Int, value: Int) {
    data[offset] = ((value ushr 8) and 0xFF).toByte()
    data[offset + 1] = (value and 0xFF).toByte()
  }
}
