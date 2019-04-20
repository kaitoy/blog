+++
categories = [ "Programming", "Container" ]
date = "2015-07-27T23:41:49-06:00"
draft = false
cover = "pcap4jlogo.png"
slug = "another-way-to-capture-lan-packets-with-pcap4j-container"
tags = [ "docker", "pcap4j" ]
title = "Another way to capture LAN packets with pcap4j container"
+++

2 days ago, I posted an article [How to capture packets on a local network with Pcap4J container](https://www.kaitoy.xyz/2015/07/25/how-to-capture-packets-on-a-local-network-with-pcap4j-container/).

Today, I was reading [Docker Docs](https://docs.docker.com/reference/run/#network-settings) and found another way to do it.
I'm writing about it here.

<br>

{{< google-adsense >}}

# --net option for docker run

When we start a docker container we use `docker run` command. It accepts some options.
`--net` is one of them, which is to set a network mode for a container.
Network modes `--net` takes are `bridge`, `none`, `container:<name|id>`, and `host`.
The `bridge` is the default mode where containers connect to the virtual Ethernet bridge `docker0`.

What I use in this article is `host` mode. If it's specified containers use the host network stack,
which means Pcap4J on a container with the `host` mode can see network interfaces on its host and sniff network traffic via them directly.

This sounds easy. And more, according to the Docker Docs, the `host` mode gives significantly better networking performance than the `bridge` mode. But instead, `host` is insecure. (See [Docker Docs - Mode: host](https://docs.docker.com/reference/run/#mode-host) for the details.)

# What I did

In the same environment with [2 days ago](https://www.kaitoy.xyz/2015/07/25/how-to-capture-packets-on-a-local-network-with-pcap4j-container/#what-i-did:a3622224f79a64f15ba6f2b66e1010d9), I did the followings:

1. Start a Pcap4J container with the network mode set to host

      ```shell
      # docker run --name pcap4j-hostnet --net=host kaitoy/pcap4j:latest
      ```

      That's it.

      The above command create a container named `pcap4j-hostnet` from the image `kaitoy/pcap4j:latest` and execute `/bin/sh /usr/local/src/pcap4j/bin/capture.sh eth0 false` in the container.
      The `capture.sh` starts packet capturing on `eth0` using Pcap4J.
      This `eth0` is the interface of the docker host mashine because the network mode is set to `host`.

      What a easy way.
