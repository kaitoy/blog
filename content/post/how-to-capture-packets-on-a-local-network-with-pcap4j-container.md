+++
categories = [ "Programming", "Container" ]
date = "2015-07-25T19:05:06-06:00"
draft = false
cover = "pcap4jlogo.png"
slug = "how-to-capture-packets-on-a-local-network-with-pcap4j-container"
tags = [ "docker", "pcap4j" ]
title = "How to capture packets on a local network with Pcap4J container"
+++

I'll show how to capture packets on a local network with Pcap4J container.

<!--more-->

{{< google-adsense >}}

# Docker network
By default, Docker containers are not connected to a local network.
They are connected only to a virtual network Docker creates as like below:

{{< figure src="/images/docker_network.jpg" alt="Docker network" width="500" >}}

Refer to [the Docker doc](https://docs.docker.com/articles/networking/) for more details.

# What's a challenge
In order to let a Pcap4J container capture packets in a local (real) network,
we need to directly connect the container to the local network,
because docker0 forwards only packets the destinations of which are in the virtual network.

How to do it is explained in some articles.
I referred to one of them, [Four ways to connect a docker container to a local network in Odd Bits blog](http://blog.oddbit.com/2014/08/11/four-ways-to-connect-a-docker/), and succeeded in local network capturing using the 4th way.

What I actually did is as follows.

# What I did
* Environment
    * OS: CentOS 7.0 (on VMware Player 7.1.0 on Windows 7)

        ```tch
        # uname -a
        Linux localhost.localdomain 3.10.0-229.el7.x86_64 #1 SMP Fri Mar 6 11:36:42 UTC 2015 x86_64 x86_64 x86_64 GNU/Linux
        ```

    * user: root
    * Pcap4J version: 1.5.1-SNAPSHOT
    * Docker version: 1.6.2
    * Network interfaces:

        ```tch
          # ip addr show
          1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
              link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
              inet 127.0.0.1/8 scope host lo
                 valid_lft forever preferred_lft forever
              inet6 ::1/128 scope host
                 valid_lft forever preferred_lft forever
          2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
              link/ether 00:0c:29:8e:95:27 brd ff:ff:ff:ff:ff:ff
              inet 192.168.1.123/24 brd 192.168.1.255 scope global dynamic eth0
                 valid_lft 85975sec preferred_lft 85975sec
              inet6 2601:282:8102:2623:20c:29ff:fe8e:9527/64 scope global dynamic
                 valid_lft 221469sec preferred_lft 221469sec
              inet6 fe80::20c:29ff:fe8e:9527/64 scope link
                 valid_lft forever preferred_lft forever
          3: docker0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 qdisc noqueue state DOWN
              link/ether 56:84:7a:fe:97:99 brd ff:ff:ff:ff:ff:ff
              inet 172.17.42.1/16 scope global docker0
                 valid_lft forever preferred_lft forever
        ```

<br>

* Prerequisites:
    * Docker is installed and Docker service is started
    * [nsenter](http://man7.org/linux/man-pages/man1/nsenter.1.html)

<br>

* Step by step
    1. Preparing

        Create a utility script `docker-pid` with the following content and place it somewhere in the `PATH`.

          ```sh
          #!/bin/sh
          exec docker inspect --format '{{ .State.Pid }}' "$@"
          ```

        This script show the PID of a docker container by name or ID.

    2. Pull the latest Pcap4J image

        ```tch
        # docker pull kaitoy/pcap4j
        ```

    3. Start a Pcap4J container with wait mode

        ```tch
        # docker run --name pcap4j-br kaitoy/pcap4j:latest eth1 true
        ```

        This container (`pcap4j-br`) waits for a ping to `eth0` on the container before staring capturing packets with `eth1` on the container.
        After the container starts, you will see messages like below:

        ```plain
        17:49:21.196 [main] INFO  org.pcap4j.core.Pcaps - 3 NIF(s) found.
        eth0 (null)
        IP address: /172.17.0.3
        IP address: /fe80:0:0:0:42:acff:fe11:3
        ```

        The messages say IP address of `eth0` is `172.17.0.3`. We will use it later.


    4. Configure a bridge interface

        Open another terminal and do the following:

        ```tch
        # ip link add eth1 link eth0 type macvlan mode bridge
        # ip link set netns $(docker-pid pcap4j-br) eth1
        # nsenter -t $(docker-pid pcap4j-br) -n ip link set eth1 up
        # nsenter -t $(docker-pid pcap4j-br) -n ip route del default
        # nsenter -t $(docker-pid pcap4j-br) -n ip addr add 192.168.1.200/24 dev eth1
        # nsenter -t $(docker-pid pcap4j-br) -n ip route add default via 192.168.1.1 dev eth1
        ```

        The above commands
        1) add an interface `eth1` bridged to `eth0` to the Docker host machine,
        2) move the `eth1` to the name space of `pcap4j-br`,
        3) start `eth1`,
        4) delete the default route in `pcap4j-br`,
        5) add an IP address `192.168.1.200/24` to `eth1`,
        6) and set the default route in `pcap4j-br` to `192.168.1.1`.

        Too much hassle? I agree. Let's use an awesome tool, [pipework](https://github.com/jpetazzo/pipework).
        This tool accomplishes the above 6 steps in easier way as shown below:

        ```tch
        # git clone https://github.com/jpetazzo/pipework.git
        # cd pipework
        # ./pipework eth0 pcap4j-br 192.168.1.200/24@192.168.1.1
        ```

        pipework uses `ip netns exec` command instead of `nsenter` to manipulate a container.
        Incidentally, `docker exec` didn't work for the step 3 due to an error "`RTNETLINK answers: Operation not permitted`".

        In addition, in my case, because I was doing it on a VMware VM, I needed to enable the promiscuous mode of `eth0` (on the docker host machine) as follows:

        ```tch
        # ip link set dev eth0 promisc on
        ```

    5. Try to poke the container

        You can now communicate with `pcap4j-br` using `eth1` **from another host**.
        I tried some pings from the VM's host to `pcap4j-br` and saw replies.

        Note that you can **NOT** communicate with `pcap4j-br` via `eth1` from the docker host.
        See the [Odd Bits blog](http://blog.oddbit.com/2014/08/11/four-ways-to-connect-a-docker/) for the details.

    6. Start packet capturing

        Ping to `eth0` of `pcap4j-br` form the docker host to start packet capturing.

        ```tch
        # ping -c 1 172.17.0.3
        ```
