+++
categories = [ "Programming" ]
date = "2015-08-09T21:53:29-06:00"
draft = false
eyecatch = "pcap4jlogo.png"
slug = "step-by-step-to-add-a-protocol-support-to-pcap4j-1"
tags = [ "pcap4j" ]
title = "Step by Step to Add a Protocol Support to Pcap4J (Part 1)"

+++

I will show how to add a protocol support to [Pcap4J](https://github.com/kaitoy/pcap4j) in detail giving the example of DHCP (v4) via some posts.

<br>

{{< google-adsense >}}

### Named Number Class
First of all, we need to know the packet format. It's explained in [RFC 2131](http://www.ietf.org/rfc/rfc2131.txt) as below:

> ```
> 0                   1                   2                   3
> 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
> |     op (1)    |   htype (1)   |   hlen (1)    |   hops (1)    |
> +---------------+---------------+---------------+---------------+
> |                            xid (4)                            |
> +-------------------------------+-------------------------------+
> |           secs (2)            |           flags (2)           |
> +-------------------------------+-------------------------------+
> |                          ciaddr  (4)                          |
> +---------------------------------------------------------------+
> |                          yiaddr  (4)                          |
> +---------------------------------------------------------------+
> |                          siaddr  (4)                          |
> +---------------------------------------------------------------+
> |                          giaddr  (4)                          |
> +---------------------------------------------------------------+
> |                                                               |
> |                          chaddr  (16)                         |
> |                                                               |
> |                                                               |
> +---------------------------------------------------------------+
> |                                                               |
> |                          sname   (64)                         |
> +---------------------------------------------------------------+
> |                                                               |
> |                          file    (128)                        |
> +---------------------------------------------------------------+
> |                                                               |
> |                          options (variable)                   |
> +---------------------------------------------------------------+
> ```
>
>  FIELD  |OCTETS |               DESCRIPTION
> --------|-------|------------------------------------------------------
> op      |   1   |  Message op code / message type.<br>1 = BOOTREQUEST, 2 = BOOTREPLY
> htype   |   1   |  Hardware address type, see ARP section in "Assigned<br>Numbers" RFC; e.g., '1' = 10mb ethernet.
> hlen    |   1   |  Hardware address length (e.g.  '6' for 10mb ethernet).
> hops    |   1   |  Client sets to zero, optionally used by relay agents when booting via a relay agent.
> xid     |   4   |  Transaction ID, a random number chosen by the client, used by the client and server to associate messages and responses between a client and a server.
> secs    |   2   |  Filled in by client, seconds elapsed since client began address acquisition or renewal process.
> flags   |   2   |  Flags (see figure 2).
> ciaddr  |   4   |  Client IP address; only filled in if client is in BOUND, RENEW or REBINDING state and can respond to ARP requests.
> yiaddr  |   4   |  'your' (client) IP address.
> siaddr  |   4   |  IP address of next server to use in bootstrap; returned in DHCPOFFER, DHCPACK by server.
> giaddr  |   4   |  Relay agent IP address, used in booting via a relay agent.
> chaddr  |  16   |  Client hardware address.
> sname   |  64   |  Optional server host name, null terminated string.
> file    | 128   |  Boot file name, null terminated string; "generic" name or null in DHCPDISCOVER, fully qualified directory-path name in DHCPOFFER.
> options | var   |  Optional parameters field.  See the options documents for a list of defined options.

It looks DHCP has only one packet format, and the packet doesn't have a payload.
So, we will need to write only one packet class, one header class, and one builder class for DHCP. Easy!

The header class will have java fields which represent the packet fields listed above (e.g. op, htype, etc.).

Let's start with writing named number classes, which we will use for types of some of the java fields of the header class.
For example, `op` field, which holds a message op code, `1` or `2` in an octet.
Although the value `op` field carries can be stored in a primitive `byte` field in the header class,
it's recommended to create a named number class to store the value with its name (meaning) for more readability and usability.
`new DhcpV4Packet.Builder().operationCode(DhcpV4OperationCode.BOOTREQUEST)` looks better than `new DhcpV4Packet.Builder().operationCode((byte)1)`, doesn't it?

Named number classes are in [`org.pcap4j.packet.namednumber package`](https://github.com/kaitoy/pcap4j/tree/master/pcap4j-core/src/main/java/org/pcap4j/packet/namednumber) in pcap4j-core project.
To write a named number class easily, extend [`NamedNumber`](https://github.com/kaitoy/pcap4j/blob/master/pcap4j-core/src/main/java/org/pcap4j/packet/namednumber/NamedNumber.java).
The minimum implementation of a number class looks like below:

```java
package org.pcap4j.packet.namednumber;

public final class DhcpV4OperationCode extends NamedNumber<Byte, DhcpV4OperationCode> {

  private static final long serialVersionUID = 3155818580398801532L;

  public DhcpV4OperationCode(Byte value, String name) {
    super(value, name);
  }

  @Override
  public int compareTo(DhcpV4OperationCode o) {
    return value().compareTo(o.value());
  }

}
```

Only one method we must implement is `compareTo`. The code in the method is always the same: `return value().compareTo(o.value());`.

And, because `NamedNumber` doesn't have the default constructor, we need to write a constructor with 2 arguments, `Byte value` and `String name`.

Sometimes we may want to override `public String valueAsString()`. For example, in the case where the String representation of the value should be like `0x0a` instead of `10`. `DhcpV4OperationCode` isn't the case, though.

Then, we'd better to add pre-defined objects so that:

* we will not need to repeatedly instantiate them for the same value, and
* we will not need to refer to the RFC when you craft DHCP packets.

```java
  public static final DhcpV4OperationCode BOOTREQUEST
    = new DhcpV4OperationCode((byte)1, "BOOTREQUEST");

  public static final DhcpV4OperationCode BOOTREPLY
    = new DhcpV4OperationCode((byte)2, "BOOTREPLY");
```

From a pre-defined object, we can get its value by `DhcpV4OperationCode.BOOTREQUEST.value()`.
But, how do we get a pre-defined object from a value? We need to do it when we parse a real packet (a byte array) captured and build a DHCP packet object.

So, let's enhance the code as follows:

```java
  private static final Map<Byte, DhcpV4OperationCode> registry
    = new HashMap<Byte, DhcpV4OperationCode>();

  static {
    registry.put(BOOTREQUEST.value(), BOOTREQUEST);
    registry.put(BOOTREPLY.value(), BOOTREPLY);
  }

  public static DhcpV4OperationCode getInstance(Byte value) {
    if (registry.containsKey(value)) {
      return registry.get(value);
    }
    else {
      return new DhcpV4OperationCode(value, "unknown");
    }
  }
```

The new field `registry` holds the mapping between values and pre-defined objects, and the `getInstance` method is the API to get a pre-defined objects (or new one if not registered) by a value by searching in the `registry`.

We may want to add one more API which is to add an object instantiated outside of this class to the `registy` like below:

```java
  public static DhcpV4OperationCode register(DhcpV4OperationCode version) {
    return registry.put(version.value(), version);
  }
```

Now, the entire code looks like below:

```java
package org.pcap4j.packet.namednumber;

import java.util.HashMap;
import java.util.Map;

public final class DhcpV4OperationCode extends NamedNumber<Byte, DhcpV4OperationCode> {

  private static final long serialVersionUID = 3155818580398801532L;

  public static final DhcpV4OperationCode BOOTREQUEST
   = new DhcpV4OperationCode((byte)1, "BOOTREQUEST");

  public static final DhcpV4OperationCode BOOTREPLY
   = new DhcpV4OperationCode((byte)2, "BOOTREPLY");

  private static final Map<Byte, DhcpV4OperationCode> registry
    = new HashMap<Byte, DhcpV4OperationCode>();

  static {
    registry.put(BOOTREQUEST.value(), BOOTREQUEST);
    registry.put(BOOTREPLY.value(), BOOTREPLY);
  }

  public static DhcpV4OperationCode getInstance(Byte value) {
    if (registry.containsKey(value)) {
      return registry.get(value);
    }
    else {
      return new DhcpV4OperationCode(value, "unknown");
    }
  }

  public static DhcpV4OperationCode register(DhcpV4OperationCode version) {
    return registry.put(version.value(), version);
  }

  public DhcpV4OperationCode(Byte value, String name) {
    super(value, name);
  }

  @Override
  public int compareTo(DhcpV4OperationCode o) {
    return value().compareTo(o.value());
  }

}
```

Likewise, `htype` should be represented by a named number class.
Fortunately, we can use the existing class [ArpHardwareType](https://github.com/kaitoy/pcap4j/blob/master/pcap4j-core/src/main/java/org/pcap4j/packet/namednumber/ArpHardwareType.java) for it.

In the [next part](https://www.kaitoy.xyz/2015/10/12/step-by-step-to-add-a-protocol-support-to-pcap4j-2/), we will write a packet piece class for the `flags` field.
