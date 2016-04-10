+++
categories = [ "Programming" ]
date = "2015-10-12T01:00:13-06:00"
draft = false
eyecatch = "pcap4jlogo.png"
slug = "step-by-step-to-add-a-protocol-support-to-pcap4j-2"
tags = [ "pcap4j" ]
title = "Step by Step to Add a Protocol Support to Pcap4J (Part 2)"
+++

This is continued from [the part 1](http://tbd.kaitoy.xyz/2015/08/09/step-by-step-to-add-a-protocol-support-to-pcap4j-1/).

We are adding DHCP support to [Pcap4J](https://github.com/kaitoy/pcap4j).

### Packet Piece Class
A packet piece class is a Java class which represents a field of a packet.
We should create such classes instead of using a primitive types in some cases.

In the case of DHCP, its __flags__ field includes two fields in itself as like below:

```text
                    1 1 1 1 1 1
0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|B|             MBZ             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

B:  BROADCAST flag
MBZ:  MUST BE ZERO (reserved for future use)
```

Although this flags field is 2 bytes long and can be held by a primitive short variable, it's better to create a packet piece class to hold it for better usability.

I mean,

```java
boolean broadcast = DhcpV4Packet.getHeader().getFlags().isBroadcast();
```

is better than

```java
boolean broadcast = (0x8000 & DhcpV4Packet.getHeader().getFlags()) != 0;
```

### DhcpV4Flags class
Now, let's write a packet piece class __DhcpV4Flags__ for the flags field.
For writing packet piece classes, there is no rule except that they must implement [Serializable interface](http://docs.oracle.com/javase/7/docs/api/java/io/Serializable.html).

```java
package org.pcap4j.packet;

import java.io.Serializable;

public final class DhcpV4Flags implements Serializable {

  private static final long serialVersionUID = -7144264525666462708L;

  private final short value;

  public static DhcpV4Flags newInstance(short value) {
    return new DhcpV4Flags(value);
  }

  private DhcpV4Flags(short value) {
    this.value = value;
  }

  public short value() {
    return value;
  }

}
```

What we should do to implement Serializable is only adding a field `private static final long serialVersionUID` in this case because DhcpV4Flags has only one primitive short field.

The short field holds entire value of the flags field.
The constructor receives a short value and simply stores it in the short field.
I made the constructor private and wrote a static factory method `newInstance`, which is just my taste and not necessary.

<br>

Here, let's remember that the flags field has two fields in itself, which are B (BROADCAST) and MBZ (MUST BE ZERO), and add two methods to get them.

```java
  public boolean isBroadcast() { return (value & 0x8000) != 0; }

  public short getMbz() { return (short)(value & 0x7FFF); }
```

<br>

And, generally speaking, we should always override `toString`, `equals`, and `hashCode`.

```java
  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("[BROADCAST: ")
      .append(isBroadcast())
      .append("] [value: 0x")
      .append(ByteArrays.toHexString(value, ""))
      .append("]");

    return sb.toString();
  }

  @Override
  public boolean equals(Object obj) {
    if (obj == this) { return true; }
    if (!this.getClass().isInstance(obj)) { return false; }

    DhcpV4Flags other = (DhcpV4Flags)obj;
    return this.value == other.value;
  }

  @Override
  public int hashCode() { return value; }
```

<br>

The last thing to write is __Builder class__, which is another way to instantiate DhcpV4Flags objects.
The static factory method I wrote above is used when dissecting a real DHCP packet (i.e. a byte array), while the Builder is used when crafting a DHCP packet object.

A Builder class is usually written as an inner class.

```java
public final class DhcpV4Flags implements Serializable {

  (snip)

  public Builder getBuilder() {
    return new Builder(this);
  }

  public static final class Builder {

    private boolean broadcast = false;
    private short mbz = 0;

    public Builder() {}

    private Builder(DhcpV4Flags flags) {
      this.broadcast = flags.isBroadcast();
      this.mbz = flags.getMbz();
    }

    public Builder broadcast(boolean broadcast) {
      this.broadcast = broadcast;
      return this;
    }

    public Builder mbz(short mbz) {
      this.mbz = mbz;
      return this;
    }

    public DhcpV4Flags build() {
      return new DhcpV4Flags(this);
    }

  }

}
```

And, DhcpV4Flags needs a constructor which uses the Builder.

```java
  private DhcpV4Flags(Builder builder) {
    if (builder == null) {
      throw new NullPointerException("builder is null.");
    }
    if (builder.mbz < 0) {
      throw new IllegalArgumentException(
              "mbz must be equal or greater than zero but it is: " + builder.mbz
            );
    }

    this.value = builder.broadcast ? (short)(builder.mbz | 0x8000) : builder.mbz;
  }
```

<br>

That's all. The entire code is as follows:

```java
package org.pcap4j.packet;

import java.io.Serializable;
import org.pcap4j.util.ByteArrays;

public final class DhcpV4Flags implements Serializable {

  private static final long serialVersionUID = -7144264525666462708L;

  private final short value;

  public static DhcpV4Flags newInstance(short value) {
    return new DhcpV4Flags(value);
  }

  private DhcpV4Flags(short value) {
    this.value = value;
  }

  private DhcpV4Flags(Builder builder) {
    if (builder == null) {
      throw new NullPointerException("builder is null.");
    }
    if (builder.mbz < 0) {
      throw new IllegalArgumentException(
              "mbz must be equal or greater than zero but it is: " + builder.mbz
            );
    }

    this.value = builder.broadcast ? (short)(builder.mbz | 0x8000) : builder.mbz;
  }

  public short value() {
    return value;
  }

  public boolean isBroadcast() { return (value & 0x8000) != 0; }

  public short getMbz() { return (short)(value & 0x7FFF); }

  public Builder getBuilder() {
    return new Builder(this);
  }

  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();
    sb.append("[BROADCAST: ")
      .append(isBroadcast())
      .append("] [value: 0x")
      .append(ByteArrays.toHexString(value, ""))
      .append("]");

    return sb.toString();
  }

  @Override
  public boolean equals(Object obj) {
    if (obj == this) { return true; }
    if (!this.getClass().isInstance(obj)) { return false; }

    DhcpV4Flags other = (DhcpV4Flags)obj;
    return this.value == other.value;
  }

  @Override
  public int hashCode() { return value; }

  public static final class Builder {

    private boolean broadcast = false;
    private short mbz = 0;

    public Builder() {}

    private Builder(DhcpV4Flags flags) {
      this.broadcast = flags.isBroadcast();
      this.mbz = flags.getMbz();
    }

    public Builder broadcast(boolean broadcast) {
      this.broadcast = broadcast;
      return this;
    }

    public Builder mbz(short mbz) {
      this.mbz = mbz;
      return this;
    }

    public DhcpV4Flags build() {
      return new DhcpV4Flags(this);
    }

  }

}
```

<br>

In the next part, we'll write the DHCP packet class.
