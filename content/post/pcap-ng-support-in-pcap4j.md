+++
categories = [ "Programming" ]
date = "2016-01-10T09:52:06-07:00"
draft = false
cover = "pcap4jlogo.png"
slug = "pcap-ng-support-in-pcap4j"
tags = [ "pcap4j" ]
title = "pcap-ng support in Pcap4J"
+++

Sometimes I receive inquiries about support for __pcap-ng__ files in [__Pcap4J__](https://github.com/kaitoy/pcap4j).
I wrote the result of my investigation on it in this article.

<br>

{{< google-adsense >}}

# What's a pcap-ng file
A pcap-ng file (i.e. a file with `.pcapng` extension ) is a packet dump file in [__The pcap Next Generation Capture File Format__](https://github.com/pcapng/pcapng) (or pcap-ng format for short).
This format was created to overcome the limitations of the traditional [__Libpcap File Format__](https://wiki.wireshark.org/Development/LibpcapFileFormat) (or pcap format for short) which is used in pcap files.

Although the pcap format has been widely used for a long time, recent [__Wireshark__](https://www.wireshark.org/), the de facto standard packet capture tool, uses the pcap-ng format by default to save captured packets.
So, it's expected that the pcap-ng format would be more common and pcap format would be a legacy in the future.

# pcap-ng support in Pcap4J
Of course Pcap4J supports traditional pcap format.
But how about the pcap-ng format?

Whether Pcap4J can handle pcap-ng files is up to its underlying native library.
Remember Pcap4J is a wrapper library for [__libpcap__](http://www.tcpdump.org/) and [__WinPcap__](http://www.winpcap.org/).
If the libpcap/WinPcap supports the pcap-ng format Pcap4J does, and vice versa.

# pcap-ng support in libpcap
The libpcap got limited support for reading pcap-ng files in [1.1.0](https://github.com/the-tcpdump-group/libpcap/blob/libpcap-1.1/CHANGES), and then the following three bugs around the feature were fixed:

* filtering issue (fixed in 1.2.1)
* [pcap_datalink() returns wrong value](https://github.com/the-tcpdump-group/libpcap/issues/139) (fixed in 1.1.2)
* [Wrong timestamps on big-endian machines](https://github.com/the-tcpdump-group/libpcap/issues/349) (fixed in 1.7.2)

No enhancement for pcap-ng support since 1.1.0 as of now (1.7.5).

I don't know what "limited" means, but anyway it looked like Pcap4J 1.6.2 could read pcap-ng files without any problems as far as I tested it with libpcap 1.7.4.

As for writing pcap-ng files, the libpcap doesn't provide any support for it yet.

# pcap-ng support in WinPcap
WinPcap is the Windows version of libpcap and each version of it is based on a certain version of libpcap.
The newest version of WinPcap, WinPcap 4.1.3, was developed with libpcap 1.0.0.
It means WinPcap doesn't support pcap-ng format yet at all.

But, there is an [unofficial build of WinPcap based on libpcap 1.7.4](http://sourceforge.net/projects/winpcap413-176/).
As far as I tested this WinPcap through Pcap4J 1.6.2, it worked well on reading pcap-ng files as well as on basic functionalities such as finding network devices and live capture except [getting capture statistics](https://github.com/kaitoy/pcap4j/issues/52).

# How to read a pcap-ng file
How to read a pcap-ng file is exactly the same as how to read a pcap file.

Use [`Pcaps.openOffline()`](http://kaitoy.github.io/pcap4j/javadoc/latest/en/org/pcap4j/core/Pcaps.html#openOffline%28java.lang.String%29) to open a pcap-ng file and call read methods such as [`getNextPacketEx()`](http://kaitoy.github.io/pcap4j/javadoc/latest/en/org/pcap4j/core/PcapHandle.html#getNextPacketEx%28%29) and [`loop()`](http://kaitoy.github.io/pcap4j/javadoc/latest/en/org/pcap4j/core/PcapHandle.html#loop%28int,%20org.pcap4j.core.PacketListener%29) on the returned [`PcapHandle`](http://kaitoy.github.io/pcap4j/javadoc/latest/en/org/pcap4j/core/PcapHandle.html) object to get packets in the file.

For example:

```java
public static void main(String args[]) throws PcapNativeException, NotOpenException {
  PcapHandle ph = Pcaps.openOffline("/path/to/test.pcapng");
  ph.setFilter("tcp", BpfProgram.BpfCompileMode.OPTIMIZE);
  while (true) {
    try {
      Packet p = ph.getNextPacketEx();
      if (p != null) {
        System.out.println(p);
      }
    } catch (EOFException e) {
      System.out.println("End of file");
      break;
    } catch (TimeoutException e) {
      System.out.println("Timed out");
      break;
    }
  }
}
```

<br>

If you try to read a pcap-ng file using Pcap4J with a native library which doesn't support pcap-ng format, Pcap4J throws [`PcapNativeException`](http://kaitoy.github.io/pcap4j/javadoc/latest/en/org/pcap4j/core/PcapNativeException.html) as follows:

```plain
Exception in thread "main" org.pcap4j.core.PcapNativeException: bad dump file format
        at org.pcap4j.core.Pcaps.openOffline(Pcaps.java:203)
        at Test.main(Test.java:16)
```
