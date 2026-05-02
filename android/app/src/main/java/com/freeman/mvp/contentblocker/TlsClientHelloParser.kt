package com.freeman.mvp.contentblocker

object TlsClientHelloParser {
  fun extractServerName(record: ByteArray): String? {
    if (record.size < 9) return null
    if ((record[0].toInt() and 0xFF) != TLS_HANDSHAKE_CONTENT_TYPE) return null

    val recordLength = readUInt16(record, 3)
    if (recordLength + TLS_RECORD_HEADER_SIZE != record.size) return null

    var cursor = TLS_RECORD_HEADER_SIZE
    if (cursor + 4 > record.size) return null

    val handshakeType = record[cursor].toInt() and 0xFF
    if (handshakeType != CLIENT_HELLO_TYPE) return null
    val handshakeLength = readUInt24(record, cursor + 1)
    cursor += 4
    if (cursor + handshakeLength > record.size) return null

    if (cursor + 2 > record.size) return null
    cursor += 2 // client version
    if (cursor + 32 > record.size) return null
    cursor += 32 // random

    if (cursor >= record.size) return null
    val sessionIdLength = record[cursor].toInt() and 0xFF
    cursor += 1 + sessionIdLength
    if (cursor > record.size) return null

    if (cursor + 2 > record.size) return null
    val cipherSuitesLength = readUInt16(record, cursor)
    cursor += 2 + cipherSuitesLength
    if (cursor > record.size) return null

    if (cursor >= record.size) return null
    val compressionMethodsLength = record[cursor].toInt() and 0xFF
    cursor += 1 + compressionMethodsLength
    if (cursor > record.size) return null

    if (cursor + 2 > record.size) return null
    val extensionsLength = readUInt16(record, cursor)
    cursor += 2
    val extensionsEnd = cursor + extensionsLength
    if (extensionsEnd > record.size) return null

    while (cursor + 4 <= extensionsEnd) {
      val extensionType = readUInt16(record, cursor)
      val extensionLength = readUInt16(record, cursor + 2)
      cursor += 4
      if (cursor + extensionLength > extensionsEnd) return null

      if (extensionType == SERVER_NAME_EXTENSION_TYPE) {
        return parseServerNameExtension(record, cursor, extensionLength)
      }

      cursor += extensionLength
    }

    return null
  }

  private fun parseServerNameExtension(data: ByteArray, offset: Int, length: Int): String? {
    if (length < 2 || offset + length > data.size) return null
    var cursor = offset
    val listLength = readUInt16(data, cursor)
    cursor += 2
    val listEnd = cursor + listLength
    if (listEnd > offset + length) return null

    while (cursor + 3 <= listEnd) {
      val nameType = data[cursor].toInt() and 0xFF
      val nameLength = readUInt16(data, cursor + 1)
      cursor += 3
      if (cursor + nameLength > listEnd) return null

      if (nameType == HOST_NAME_TYPE) {
        val host = data.copyOfRange(cursor, cursor + nameLength).toString(Charsets.UTF_8)
          .lowercase()
          .trimEnd('.')
        if (host.isNotBlank()) return host
      }

      cursor += nameLength
    }

    return null
  }

  private fun readUInt16(data: ByteArray, offset: Int): Int {
    if (offset + 1 >= data.size) return 0
    return ((data[offset].toInt() and 0xFF) shl 8) or (data[offset + 1].toInt() and 0xFF)
  }

  private fun readUInt24(data: ByteArray, offset: Int): Int {
    if (offset + 2 >= data.size) return 0
    return ((data[offset].toInt() and 0xFF) shl 16) or
      ((data[offset + 1].toInt() and 0xFF) shl 8) or
      (data[offset + 2].toInt() and 0xFF)
  }

  private const val TLS_RECORD_HEADER_SIZE = 5
  private const val TLS_HANDSHAKE_CONTENT_TYPE = 22
  private const val CLIENT_HELLO_TYPE = 1
  private const val SERVER_NAME_EXTENSION_TYPE = 0
  private const val HOST_NAME_TYPE = 0
}
