+++
categories = [ "Pcap4J" ]
date = "2015-07-19T16:25:03-06:00"
draft = false
eyecatch = "runc.png"
tags = [ "pcap4j", "runc", "docker" ]
title = "Pcap4J container with runC"
slug = "pcap4j-container-with-runc"
+++

I tried to run a [Pcap4J container](https://registry.hub.docker.com/u/kaitoy/pcap4j/) with [runC](https://runc.io/).

## What is Pcap4J?
Pcap4J is a Java library for capturing, crafting, and sending packets.
It's actually a Java wrapper for libpcap/WinPcap plus packet analyzer.
We can see the details in its [README](https://github.com/kaitoy/pcap4j).

## What is runC?
runC is a container runtime developed by Docker and released on June 22, 2015.
With runC, we can start a container from a docker image without the docker service or the docker command.

That said, as of now, runC cannot directory use docker images.
We need to create a container form a docker image and export its filesystem before executing runC.

It seems currently it supports only Linux but Windows support is in the roadmap.

## What I did
* Environment
    * OS: CentOS 7 (on VMware Player 7.1.0 on Windows 7)
    * user: root
    * runC version: 0.2
    * Pcap4J version: 1.5.1-SNAPSHOT
    * Docker version: 1.6.2

<br>

* Prerequisites:
    * Docker is installed and Docker service is started
    * [Go](https://golang.org/) is installed

<br>

* Step by step
    1. Install runC

        ```sh
        [root@localhost ~]# mkdir -p $GOPATH/src/github.com/opencontainers
        [root@localhost ~]# cd $GOPATH/src/github.com/opencontainers
        [root@localhost opencontainers]# git clone https://github.com/opencontainers/runc
        [root@localhost opencontainers]# cd runc
        [root@localhost runc]# make && make install
        ```

    2. Pull the Pcap4J docker image.

        ```sh
        [root@localhost ~]# docker pull kaitoy/pcap4j
        ```

    3. Create a container from the image.

        ```sh
        [root@localhost ~]# docker run -d --name pcap4j-tmp kaitoy/pcap4j:latest /bin/bash
        ```

    4. Export the container's file system.

        ```sh
        [root@localhost ~]# mkdir /tmp/pcap4j-test
        [root@localhost pcap4j-test]# cd /tmp/pcap4j-test
        [root@localhost pcap4j-test]# docker export pcap4j-tmp > pcap4j.tar
        [root@localhost pcap4j-test]# tar xf pcap4j.tar
        ```

        We are now free from Docker. We don't need Docker service, Docker command, Docker images, nor Docker containers anymore.

    5. Generate a container config file.

        ```sh
        [root@localhost pcap4j-test]# runc spec | sed -e 's/rootfs/\/root\/Desktop\/pcap4j-container/' -e 's/"readonly": true/"readonly": false/' -e 's/"NET_BIND_SERVICE"/"NET_BIND_SERVICE","NET_ADMIN","NET_RAW"/' > config.json
        ```

        In the above command, `runc spec` generates a standard container config file and `sed` modifies it for Pcap4J.

    6. Run a container.

        ```sh
        [root@localhost pcap4j-test]# runc
        ```

    7. In the container, enable lo.

        As far as I saw, lo is the only interface we can use in a container.
        So, I used it to capture packets.

        ```sh
        sh-4.1# ifconfig lo up
        ```

    8. Generate a script to ping localhost and run it background.

        ```sh
        sh-4.1# cd /usr/local/src/pcap4j/bin
        sh-4.1# echo ping 127.0.0.1 \> /dev/null > pinger.sh
        sh-4.1# chmod +x pinger.sh
        sh-4.1# ./pinger.sh &
        ```

        In the next step, ICMP packets from this pinger.sh will be captured.

    9. Generate a script to start capturing packets with Pcap4J and run it.

        ```sh
        sh-4.1# cat runGetNextPacket.sh | sed -e 's/eth0/lo/' > foo.sh
        sh-4.1# chmod +x foo.sh
        sh-4.1# ./foo.sh
        ```

        We will see the ICMP packets are dumped on the terminal. That's it!
