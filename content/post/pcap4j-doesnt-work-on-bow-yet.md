+++
categories = [ "Programming" ]
date = "2016-11-19T11:41:07-07:00"
draft = false
eyecatch = "pcap4jlogo.png"
slug = "pcap4j-doesnt-work-on-bow-yet"
tags = [ "bow", "windows", "pcap4j" ]
title = "Currently Pcap4J Doesn't Work on Bash on Windows"
+++

# TL;DR
I've attempted to run [__Pcap4J__](https://github.com/kaitoy/pcap4j) on [__Bash on Windows__](https://msdn.microsoft.com/en-us/commandline/wsl/about) (BoW) but it didn't work due to lack of support for network staff in BoW.

<br>

{{< google-adsense >}}

# What's Bash on Windows
Bash on Windows is a feature released in [Windows 10 Anniversary Update](https://blogs.windows.com/windowsexperience/2016/08/02/how-to-get-the-windows-10-anniversary-update/#j0WW1oOyf4smWkeX.97) to add Linux fanctionalities to Windows.

With this feature, we can run Bash and several Linux commands on Windows.

It sounds similar to [Cygwin](https://www.cygwin.com/) and [MinGW](http://www.mingw.org/) but actually different. Linux commands Cygwin and MinGW provides are Windows-native binaries. On the other hand, BoW enables to run Ubuntu instance as a subsystem of Windows and to execute Ubuntu-native binaries on it.

BoW can be easily installed by only 2 steps as per [the installation guide](https://msdn.microsoft.com/commandline/wsl/install_guide).

# Try Pcap4J in BoW
BoW can be started by `bash` command in command prompt.

```cmd
C:\Users\kaitoy>bash
kaitoy@DESKTOP-41L0NMU:/mnt/c/Users/kaitoy$ uname -a
Linx DESKTOP-41L0NMU 3.4.0+ #1 PREEMPT Thu Aug 1 17:06:05 CST 2013 x86_64 x86_64 x86_64 GNU/Linux
```

In the bash, I ran the following commands to install Pcap4J dependencies:

```bash
sudo apt-get update
sudo apt-get install openjdk-7-jdk libpcap-dev
```

Then, I executed Pcap4J (org.pcap4j.sample.GetNextPacketEx) and got an error as follows:

```bash
$ java -cp pcap4j-core-1.6.2.jar:pcap4j-packetfactory-static-1.6.2.jar:pcap4j-sample-1.6.2.jar:jna-4.2.1.jar:slf4j-api-1.7.12.jar:logback-classic-1.0.0.jar:logback-core-1.0.0.jar org.pcap4j.sample.GetNextPacketEx
org.pcap4j.sample.GetNextPacketEx.count: 5
org.pcap4j.sample.GetNextPacketEx.readTimeout: 10
org.pcap4j.sample.GetNextPacketEx.snaplen: 65536


java.io.IOException: Return code: -1, Message: getifaddrs: Invalid argument
        at org.pcap4j.util.NifSelector.selectNetworkInterface(NifSelector.java:40)
        at org.pcap4j.sample.GetNextPacketEx.main(GetNextPacketEx.java:43)
```

This error seems due to [lack of support](https://github.com/Microsoft/BashOnWindows/issues/69) for network staff in BoW.

BoW is still beta. I will try again after its production release.
