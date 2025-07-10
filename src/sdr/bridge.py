import argparse
import sys
import time
from typing import Optional

import serial


def open_port(port: str, baud: int) -> serial.Serial:
    """Open serial port."""
    return serial.Serial(port=port, baudrate=baud, timeout=1)


def send_bulletin(text: str, port: str = "/dev/ttyUSB0", baud: int = 9600):
    """Send a text bulletin via serial radio/tnc."""
    with open_port(port, baud) as ser:
        ser.write(text.encode("utf-8") + b"\n")
        ser.flush()


def listen(port: str = "/dev/ttyUSB0", baud: int = 9600):
    """Continuously read bulletins from the serial port."""
    with open_port(port, baud) as ser:
        try:
            while True:
                line = ser.readline()
                if line:
                    ts = time.strftime("%Y-%m-%d %H:%M:%S")
                    print(f"[{ts}] {line.decode('utf-8', 'ignore').strip()}")
        except KeyboardInterrupt:
            return


def main(argv=None):
    p = argparse.ArgumentParser(description="SDR text bulletin bridge")
    p.add_argument("command", choices=["send", "listen"], help="Action to perform")
    p.add_argument("message", nargs="?", help="Message to send")
    p.add_argument("--port", default="/dev/ttyUSB0")
    p.add_argument("--baud", type=int, default=9600)
    args = p.parse_args(argv)

    if args.command == "send":
        if not args.message:
            print("Message required for send", file=sys.stderr)
            return 1
        send_bulletin(args.message, args.port, args.baud)
    else:
        listen(args.port, args.baud)


if __name__ == "__main__":
    sys.exit(main())
