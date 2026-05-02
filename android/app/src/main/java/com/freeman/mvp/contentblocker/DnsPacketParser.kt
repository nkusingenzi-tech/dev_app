package com.freeman.mvp.contentblocker

object DnsPacketParser {
  fun extractQueryDomain(dnsPayload: ByteArray): String? {
    if (dnsPayload.size < 12) return null

    val questionCount = readUInt16(dnsPayload, 4)
    if (questionCount <= 0) return null

    var offset = 12
    val labels = mutableListOf<String>()

    while (offset < dnsPayload.size) {
      val length = dnsPayload[offset].toInt() and 0xFF
      if (length == 0) {
        offset += 1
        break
      }

      if ((length and 0xC0) == 0xC0) {
        return null
      }

      offset += 1
      if (offset + length > dnsPayload.size) return null

      val label = dnsPayload.copyOfRange(offset, offset + length).toString(Charsets.UTF_8)
      if (label.isBlank()) return null
      labels.add(label)
      offset += length
    }

    if (labels.isEmpty()) return null
    if (offset + 4 > dnsPayload.size) return null

    return labels.joinToString(".").lowercase().trimEnd('.')
  }

  fun buildBlockedResponse(queryPayload: ByteArray): ByteArray? {
    if (queryPayload.size < 12) return null

    val questionEnd = findQuestionEnd(queryPayload) ?: return null
    val response = ByteArray(questionEnd)
    System.arraycopy(queryPayload, 0, response, 0, questionEnd)

    val recursionDesired = queryPayload[2].toInt() and 0x01
    response[2] = (0x80 or recursionDesired).toByte()
    response[3] = 0x83.toByte()
    response[6] = 0
    response[7] = 0
    response[8] = 0
    response[9] = 0
    response[10] = 0
    response[11] = 0

    return response
  }

  private fun findQuestionEnd(dnsPayload: ByteArray): Int? {
    val questionCount = readUInt16(dnsPayload, 4)
    if (questionCount <= 0) return null

    var offset = 12
    repeat(questionCount) {
      while (offset < dnsPayload.size) {
        val length = dnsPayload[offset].toInt() and 0xFF
        offset += 1
        if (length == 0) break
        if ((length and 0xC0) == 0xC0) return null
        if (offset + length > dnsPayload.size) return null
        offset += length
      }

      if (offset + 4 > dnsPayload.size) return null
      offset += 4
    }

    return offset
  }

  private fun readUInt16(data: ByteArray, offset: Int): Int {
    if (offset + 1 >= data.size) return 0
    return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
  }
}
