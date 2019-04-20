+++
categories = [ "Programming" ]
date = "2016-01-12T08:43:30-07:00"
draft = false
cover = "pcap4jlogo.png"
slug = "pcap4j-with-four-native-libraries-on-windows10"
tags = [ "pcap4j", "windows" ]
title = "Pcap4J with Four Native Libraries on Windows 10"
+++

I did some basic tests for __[Pcap4J](https://github.com/kaitoy/pcap4j)__ 1.6.2 on Windows 10 Pro on [VMware Player](https://www.vmware.com/products/player) 7.1.0 using the following native packet capture libraries:

* __[Official WinPcap](http://www.winpcap.org/)__ 4.1.3
* __[Unofficial WinPcap based on libpcap 1.7.4](http://sourceforge.net/projects/winpcap413-176/)__
* __[Win10Pcap](http://www.win10pcap.org/)__ 10.2
* __[Npcap](https://github.com/nmap/npcap)__ 0.0.5

This article explains each of the above libraries and tells the test results.

<br>

{{< google-adsense >}}

# Official WinPcap
WinPcap is the most common native packet capture library developed based on [__libpcap__](http://www.tcpdump.org/).
(WinPcap 4.1.3 is based on libpcap 1.0.0.)
It's famous as a component of the de facto standard packet capture tool [__Wireshark__](https://www.wireshark.org/).

WinPcap consists of __NPF driver__, __wpcap.dll__, and __Packet.dll__.
The structure is described in the [WinPcap manual](http://www.winpcap.org/docs/docs_412/html/group__NPF.html) as below:

<img alt="NPF" src="http://www.winpcap.org/docs/docs_412/html/npf-npf.gif" style="margin: 0px auto; display: block;">

wpcap.dll is Windows version of libpcap.so. It uses Packet Driver API implemented in Packet.dll.
Packet.dll talks with the NPF driver.
wpcap.dll and Packet.dll are installed in `C:\Windows\System32\` (64 bit binaries) and `C:\Windows\SysWOW64\` (32 bit binaries).

WinPcap worked without any problems in my tests.

# WinPcap based on libpcap 1.7.4
This is an unofficial version of WinPcap which was built on libpcap 1.7.4.
This doesn't include NPF driver and doesn't update Packet.dll.
These two components need to be installed from the official WinPcap 4.1.3.

This worked well but [one moderate problem](https://github.com/kaitoy/pcap4j/issues/52).

# Win10Pcap
Win10Pcap is a WinPcap-based packet capture library developed by [Daiyuu Nobori](http://dnobori.cs.tsukuba.ac.jp/en/).
This includes its own NPF driver and Packet.dll.
The wpcap.dll Win10Pcap installs is exactly the same as one of the official WinPcap 4.1.3.

The difference between the original WinPcap and Win10Pcap is [__NDIS__](http://www.ndis.com/) (Network Driver Interface Specification) version.
Win10Pcap is based on NDIS 6.x while WinPcap is based on 5.x.

NDIS version history is as follows:

* NDIS 2.0: MS-DOS, Windows for Workgroups 3.1
* NDIS 3.0: Windows for Workgroups 3.11, NT 3.5
* NDIS 3.1: Windows 95
* NDIS 4.0: Windows 95 OSR2, NT 4.0
* NDIS 4.1: Windows 98, NT 4.0 SP3
* NDIS 5.0: Windows 98 SE, Me, 2000
* NDIS 5.1: Windows XP
* NDIS 5.2: Windows Server 2003
* NDIS 6.0: Windows Vista
* NDIS 6.1: Windows Vista SP1, Server 2008
* NDIS 6.2: Windows 7, Server 2008 R2
* NDIS 6.3: Windows 8, Server 2012
* NDIS 6.4: Windows 8.1, Server 2012 R2
* NDIS 6.5: Windows 10, Server 2016

Although NDIS 6.x is backward-compatible with 5.x and WinPcap can run on Vista and newer ones, it's expected Win10Pcap is faster than WinPcap because the newer NDIS is more efficient than older versions.

Win10Pcap worked mostly fine in my tests, but it didn't detect MAC addresses and IPv6 addresses on devices.

# Npcap
Npcap is another NDIS 6.x based version of WinPcap developed by [Yang Luo](http://www.veotax.com/) for [Nmap](https://nmap.org/).

Npcap has a special functionality that allows to capture/send loopback packets.
It creates an adapter __"Npcap Loopback Adapter"__ for the functionality during its installation.
This adapter can be used in the same way as other normal adapters.

Npcap provides its own NPF driver and Packet.dll but wpcap.dll is the one pulled from the official WinPcap 4.1.3.

I installed Npcap with __"WinPcap Compatible Mode"__ ON for my tests.
It perfectly worked including MAC/IPv6 addresses detection.
