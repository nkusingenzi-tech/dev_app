package com.freeman.mvp.contentblocker

object Blocklist {
  private val exactBlockedDomains = setOf(
    "pornhub.com",
    "xvideos.com",
    "xnxx.com",
    "xhamster.com",
    "redtube.com",
    "youporn.com",
    "tube8.com",
    "spankbang.com",
    "dns.google",
    "cloudflare-dns.com",
    "one.one.one.one",
    "mozilla.cloudflare-dns.com",
    "security.cloudflare-dns.com",
    "family.cloudflare-dns.com",
    "doh.opendns.com",
    "dns.quad9.net",
    "dns.adguard-dns.com",
    "unfiltered.adguard-dns.com",
    "dns.nextdns.io",
    "freedns.controld.com"
  )

  private val adultKeywordFragments = setOf(
    "porn",
    "porno",
    "pornhub",
    "xvideos",
    "xnxx",
    "xhamster",
    "redtube",
    "youporn",
    "tube8",
    "spankbang",
    "brazzers",
    "chaturbate",
    "stripchat",
    "livejasmin",
    "manyvids",
    "onlyfans",
    "fansly",
    "bongacams",
    "camsoda",
    "cam4",
    "myfreecams",
    "adultfriendfinder",
    "fapello",
    "erome",
    "naughtyamerica",
    "bangbros",
    "realitykings",
    "teamskeet",
    "mofos",
    "vrporn",
    "eporner",
    "beeg",
    "tnaflix",
    "motherless",
    "efukt",
    "fux",
    "fuq",
    "porntrex",
    "pornhd",
    "pornhat",
    "pornone",
    "pornpics",
    "porn300",
    "porn00",
    "pornzog",
    "pornwhite",
    "hentai",
    "nsfw",
    "erotic",
    "erotica",
    "nude",
    "nudity",
    "adultvideo",
    "adultvideos",
    "sexvideo",
    "sexvideos",
    "sexcam",
    "webcamsex",
    "camgirl",
    "camgirls",
    "javhd"
  )

  private val adultLabelTokens = setOf(
    "adult",
    "adults",
    "sex",
    "sexy",
    "xxx",
    "18plus",
    "18only",
    "nudes",
    "milf",
    "bdsm",
    "fetish",
    "escort",
    "escorts"
  )

  fun isBlocked(domain: String): Boolean {
    val normalized = domain.lowercase().trimEnd('.')
    val labels = normalized.split('.').filter { it.isNotBlank() }
    val compactDomain = labels.joinToString("")

    if (exactBlockedDomains.any { blocked ->
      normalized == blocked || normalized.endsWith(".$blocked")
    }) {
      return true
    }

    if (adultKeywordFragments.any { keyword -> compactDomain.contains(keyword) }) {
      return true
    }

    return labels.any { label ->
      val tokens = label.split('-', '_').filter { it.isNotBlank() }
      label in adultLabelTokens || tokens.any { it in adultLabelTokens }
    }
  }
}
