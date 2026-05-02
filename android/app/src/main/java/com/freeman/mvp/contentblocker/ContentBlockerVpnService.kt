package com.freeman.mvp.contentblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.ActivityManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.system.OsConstants
import android.util.Log
import com.freeman.mvp.MainActivity
import com.freeman.mvp.R
import java.io.File
import java.net.Inet4Address
import java.net.InetAddress
import java.util.concurrent.atomic.AtomicBoolean

class ContentBlockerVpnService : VpnService() {
  private val running = AtomicBoolean(false)
  private val tun2Socks = Tun2SocksNative()
  private var vpnInterface: ParcelFileDescriptor? = null
  private var socksProxy: Socks5DirectProxy? = null
  private var healthCheckThread: Thread? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      ContentBlockerPrefs.setEnabled(this, false)
      stopVpn()
      return START_NOT_STICKY
    }

    if (running.get()) return START_STICKY

    startForeground(NOTIFICATION_ID, createNotification())
    runCatching { startVpn() }.onFailure { exception ->
      Log.e(TAG, "Failed to start VPN", exception)
      ContentBlockerPrefs.setEnabled(this, false)
      stopVpn()
    }
    return START_STICKY
  }

  override fun onDestroy() {
    stopVpn()
    super.onDestroy()
  }

  private fun startVpn() {
    val dnsServers = getSystemDnsServers().ifEmpty { fallbackDnsServers() }
    if (dnsServers.isEmpty()) {
      Log.w(TAG, "No system DNS servers found; VPN not started")
      ContentBlockerPrefs.setEnabled(this, false)
      stopSelf()
      return
    }

    running.set(true)
    socksProxy = Socks5DirectProxy(this, running).apply { start() }

    val builder = Builder()
      .setSession("Freeman Content Blocker")
      .setMtu(1500)
      .addAddress(VPN_ADDRESS, 32)
      .addRoute("0.0.0.0", 0)
      .allowFamily(OsConstants.AF_INET)

    runCatching {
      builder.addDisallowedApplication(packageName)
    }.onFailure { exception ->
      Log.w(TAG, "Could not exclude Freeman from its own VPN route", exception)
    }

    dnsServers.forEach { dnsServer ->
      builder.addDnsServer(dnsServer)
    }

    vpnInterface = builder.establish()
    val descriptor = vpnInterface ?: run {
      ContentBlockerPrefs.setEnabled(this, false)
      stopSelf()
      return
    }

    val config = writeTun2SocksConfig()
    tun2Socks.TProxyStartService(config.absolutePath, descriptor.fd)
    ContentBlockerPrefs.setEnabled(this, true)
    Log.i(TAG, "Filtered full tunnel established with DNS servers: ${dnsServers.joinToString { it.hostAddress ?: it.hostName }}")
    scheduleVpnHealthCheck()
  }

  private fun stopVpn() {
    running.set(false)
    healthCheckThread?.interrupt()
    healthCheckThread = null
    runCatching { tun2Socks.TProxyStopService() }
    socksProxy?.stop()
    socksProxy = null
    vpnInterface?.close()
    vpnInterface = null
    ContentBlockerPrefs.setEnabled(this, false)
    stopForeground(Service.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun scheduleVpnHealthCheck() {
    healthCheckThread = Thread({
      try {
        Thread.sleep(VPN_VALIDATION_TIMEOUT_MS)
        if (!running.get()) return@Thread
        if (isVpnValidated()) {
          Log.i(TAG, "Full tunnel is validated")
          return@Thread
        }

        Log.w(TAG, "Full tunnel was not validated; stopping blocker to preserve internet access")
        ContentBlockerPrefs.setEnabled(this, false)
        stopVpn()
      } catch (exception: InterruptedException) {
        Thread.currentThread().interrupt()
      } catch (exception: Exception) {
        Log.w(TAG, "Full tunnel health check failed; stopping blocker to preserve internet access", exception)
        ContentBlockerPrefs.setEnabled(this, false)
        stopVpn()
      }
    }, "FreemanVpnHealth").apply { start() }
  }

  private fun isVpnValidated(): Boolean {
    val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    return connectivityManager.allNetworks.any { network ->
      val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return@any false
      capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN) &&
        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
  }

  private fun getSystemDnsServers(): List<InetAddress> {
    val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val activeNetwork = connectivityManager.activeNetwork ?: return emptyList()
    val linkProperties = connectivityManager.getLinkProperties(activeNetwork) ?: return emptyList()
    return linkProperties.dnsServers.filterIsInstance<Inet4Address>()
  }

  private fun fallbackDnsServers(): List<InetAddress> {
    return listOf("1.1.1.1", "8.8.8.8").mapNotNull { address ->
      runCatching { InetAddress.getByName(address) as? Inet4Address }.getOrNull()
    }
  }

  private fun createNotification(): Notification {
    createNotificationChannel()

    val contentIntent = PendingIntent.getActivity(
      this,
      0,
      Intent(this, MainActivity::class.java),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val stopIntent = PendingIntent.getService(
      this,
      1,
      Intent(this, ContentBlockerVpnService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.mipmap.ic_launcher)
      .setContentTitle("Freeman content blocker")
      .setContentText("Filtering blocked content through a local VPN")
      .setContentIntent(contentIntent)
      .addAction(Notification.Action.Builder(R.mipmap.ic_launcher, "Stop", stopIntent).build())
      .setOngoing(true)
      .build()
  }

  private fun writeTun2SocksConfig(): File {
    val config = File(cacheDir, "freeman-tun2socks.yml")
    config.writeText(
      """
      tunnel:
        mtu: 1500
        ipv4: $VPN_ADDRESS
      socks5:
        address: 127.0.0.1
        port: ${Socks5DirectProxy.DEFAULT_TCP_PORT}
        udp: 'udp'
        udp-address: 127.0.0.1
      misc:
        task-stack-size: 24576
        tcp-buffer-size: 16384
        udp-recv-buffer-size: 262144
        udp-copy-buffer-nums: 4
        connect-timeout: 10000
        tcp-read-write-timeout: 300000
        udp-read-write-timeout: 60000
        log-level: warn
      """.trimIndent()
    )
    return config
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Content blocker",
      NotificationManager.IMPORTANCE_LOW
    )
    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    notificationManager.createNotificationChannel(channel)
  }

  companion object {
    private const val TAG = "FreemanVpnService"
    private const val CHANNEL_ID = "freeman_content_blocker"
    private const val NOTIFICATION_ID = 4021
    private const val VPN_ADDRESS = "10.23.0.2"
    private const val VPN_VALIDATION_TIMEOUT_MS = 20_000L
    const val ACTION_STOP = "com.freeman.mvp.contentblocker.STOP"

    fun isRunning(context: Context): Boolean {
      val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
      return activityManager.getRunningServices(Int.MAX_VALUE).any { service ->
        service.service.className == ContentBlockerVpnService::class.java.name
      }
    }
  }
}
