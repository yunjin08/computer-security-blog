---
title: "Machine Problem 2: RSA-OAEP Authenticated Encryption"
subtitle: "Encrypt-then-Sign — Writeup"
date: "2026-04-25"
author: "Al Glenrey Tilacas, Princess Parages, Jed Edison Donaire"
excerpt: "Building a complete RSA-OAEP authenticated encryption system using the encrypt-then-sign scheme, with separate key pairs and a trusted directory service — without implementing any crypto from scratch."
heroImage: "hero.webp"
thumbnail: "hero.webp"
---

## 1. Introduction

In this machine problem, we were asked to build a program that encrypts and decrypts a short ASCII message using RSA-OAEP with authenticity. The requirements were specific: use the encrypt-then-sign scheme, use a separate key pair for encryption and for signing, leverage existing cryptographic libraries rather than rolling our own primitives, and handle the fact that RSA is not normally designed to encrypt raw plaintext directly.

This writeup walks through every decision we made: the cryptographic scheme, why we made each design choice, how the trusted directory service works, and how to use the program from start to finish with actual sample runs.

## 2. Background and Cryptographic Design

Before writing a single line of code, we had to understand what the spec was actually asking for and what the right approach looks like.

### 2.1 Why RSA-OAEP, not Textbook RSA

Textbook RSA directly raises the plaintext to the power of the public exponent modulo `n`. This is deterministic, meaning the same plaintext always produces the same ciphertext, and it is malleable, meaning an attacker can manipulate ciphertexts in predictable ways. Neither of these properties is acceptable for real use.

RSA-OAEP (Optimal Asymmetric Encryption Padding) fixes both of these problems. Before encryption, the plaintext is padded using a randomized scheme involving a hash function and a mask generation function (MGF). This makes the encryption probabilistic and adds redundancy that the decryption step checks, meaning tampering with the ciphertext is detected. We used SHA-256 and MGF1-SHA-256 throughout, which is the current standard choice.

There is one practical constraint: a 2048-bit RSA key can encrypt at most `2048/8 − 2×32 − 2 = 190` bytes of plaintext under OAEP with SHA-256. Our messages are capped at 140 ASCII bytes, so we fit comfortably within this limit without needing a hybrid (RSA + AES) construction.

### 2.2 Encrypt-then-Sign

There are three common ways to combine encryption and authentication:

| Scheme | Order | Problem |
|---|---|---|
| Sign-then-Encrypt | sign plaintext, then encrypt everything | Signature is hidden inside ciphertext; receiver could re-encrypt and forward as if they sent it |
| Encrypt-then-Sign | encrypt plaintext, then sign the ciphertext | Signature is publicly visible and tied to the exact ciphertext blob |
| Encrypt-and-Sign | do both in parallel | Signature leaks information about the plaintext |

We used **Encrypt-then-Sign** as required. This means the sender first produces the ciphertext using the recipient's RSA-OAEP public key, then signs *the ciphertext* (not the plaintext) using their own RSA-PSS private key. The receiver verifies the signature first, and only if it passes does decryption proceed. This ensures authenticity is checked before any plaintext is revealed.

Signing the ciphertext rather than the plaintext is important: it binds the sender's identity to the exact encrypted blob, so a third party cannot take a valid ciphertext and re-sign it to impersonate the sender.

### 2.3 Separate Keys for Encryption and Signing

The spec requires separate key pairs for encryption and signing, and this is the correct practice. Reusing one key pair for both roles can cause subtle security problems — for example, RSA keys used for signatures and for encryption have subtly different mathematical properties and threat models. Keeping them separate also means a compromise of one key (say, the signing key) does not immediately expose encrypted messages.

Each user in our system therefore has two key pairs:

| Key pair | Role | Who uses the public key |
|---|---|---|
| `<name>_enc` | Encryption (RSA-OAEP) | Senders look this up to encrypt for the user |
| `<name>_sign` | Signing (RSA-PSS) | Recipients look this up to verify the sender |

### 2.4 RSA-PSS for Signing

For the signing scheme we used RSA-PSS (Probabilistic Signature Scheme), which is the modern standard for RSA signatures. Like OAEP, PSS is probabilistic and provably secure in the random oracle model. We used maximum salt length (`PSS.MAX_LENGTH`), which gives the strongest security margin for our 2048-bit keys.

### 2.5 The Trusted Directory Service

The spec asks the program to act as a trusted directory service for public keys. Our implementation stores every user's public keys in a single JSON file (`directory.json`). When a sender wants to encrypt for a recipient, they look up the recipient's public encryption key from the directory. When a recipient wants to verify a signature, they look up the sender's public signing key from the directory. Private keys never enter the directory.

In a real deployment, this directory would be a server with access controls and certificate pinning. For this machine problem, a local JSON file models the concept correctly.

## 3. Implementation

The entire program lives in a single file: `rsa_oaep.py`. It uses the `pyca/cryptography` library, which is the standard Python cryptographic library and uses OpenSSL under the hood. No cryptographic algorithms were implemented from scratch.

### 3.1 File and Folder Structure

```
mp2_rsa_oaep/
├── rsa_oaep.py          ← the program
├── requirements.txt     ← pip install cryptography>=42.0
├── directory.json       ← trusted public-key store (sample)
├── ciphertext.json      ← sample encrypted+signed message
└── keys/
    ├── alice_enc_private.pem
    ├── alice_enc_public.pem
    ├── alice_sign_private.pem
    ├── alice_sign_public.pem
    ├── bob_enc_private.pem
    ├── bob_enc_public.pem
    ├── bob_sign_private.pem
    └── bob_sign_public.pem
```

### 3.2 Code Structure

The source file is organized into four sections:

**Configuration** — constants for file paths, the maximum message length (140), and the RSA key size (2048 bits).

**Directory Helpers** — `load_directory()` and `save_directory()` read and write `directory.json`. This is the trusted key store that simulates a directory service.

**Key I/O** — `load_private_key()` reads a private key from the `keys/` directory, and `load_public_key_from_directory()` retrieves a public key from the directory rather than from disk, enforcing the separation between what senders/receivers need.

**Commands** — four functions that implement the four operations: `cmd_keygen`, `cmd_list`, `cmd_encrypt`, `cmd_decrypt`. Each maps to a CLI subcommand.

### 3.3 Encryption (cmd_encrypt)

```python
# Step 1 — Encrypt with recipient's public enc key (RSA-OAEP / SHA-256)
recip_pub  = load_public_key_from_directory(recipient, "enc")
ciphertext = recip_pub.encrypt(
    message.encode("ascii"),
    padding.OAEP(
        mgf=padding.MGF1(algorithm=hashes.SHA256()),
        algorithm=hashes.SHA256(),
        label=None,
    ),
)

# Step 2 — Sign the ciphertext with sender's private signing key (RSA-PSS / SHA-256)
sender_priv = load_private_key(sender, "sign")
signature   = sender_priv.sign(
    ciphertext,
    padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH,
    ),
    hashes.SHA256(),
)
```

The output is a JSON package containing the scheme name, sender, recipient, and the base64-encoded ciphertext and signature:

```json
{
  "scheme": "RSA-OAEP-SHA256 + RSA-PSS-SHA256 (encrypt-then-sign)",
  "sender": "alice",
  "recipient": "bob",
  "ciphertext": "JdH4Hr...",
  "signature": "C8Lr9H..."
}
```

### 3.4 Decryption (cmd_decrypt)

```python
# Step 1 — Verify signature first (abort if it fails)
sender_pub = load_public_key_from_directory(sender, "sign")
sender_pub.verify(sig, ct, padding.PSS(...), hashes.SHA256())

# Step 2 — Decrypt only after signature passes
recip_priv = load_private_key(recipient, "enc")
plaintext  = recip_priv.decrypt(ct, padding.OAEP(...))
```

The order matters: we verify before decrypting. If the signature check fails, the program exits immediately with an error and never touches the private key or reveals plaintext. This is the correct verify-then-decrypt discipline.

## 4. Usage

### 4.1 Setup

```bash
# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install the only dependency
pip install -r requirements.txt
```

### 4.2 Step-by-Step Workflow

**1. Generate key pairs.** Each user needs two: one for encryption, one for signing.

```bash
python3 rsa_oaep.py keygen --name alice --type enc
python3 rsa_oaep.py keygen --name alice --type sign
python3 rsa_oaep.py keygen --name bob   --type enc
python3 rsa_oaep.py keygen --name bob   --type sign
```

Output:
```text
[OK] Generated enc keypair for 'alice'
     Private: keys/alice_enc_private.pem
     Public:  keys/alice_enc_public.pem
     Saved to: directory.json
```

**2. View the directory.** Confirm all public keys are registered.

```bash
python3 rsa_oaep.py list
```

Output:
```text
Name         Type   Key excerpt
------------------------------------------------------------
alice        enc    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC...
alice        sign   MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC...
bob          enc    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC...
bob          sign   MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKC...
```

**3. Encrypt and sign a message.** Alice sends to Bob.

```bash
python3 rsa_oaep.py encrypt \
  --from alice \
  --to   bob \
  --msg  "Hello Bob, this is Alice. Sending you a secret." \
  --out  ciphertext.json
```

Output:
```text
[OK] Encrypted and signed -> ciphertext.json
     Ciphertext: 256 bytes
     Signature:  256 bytes
```

**4. Verify and decrypt.** Bob receives and decrypts.

```bash
python3 rsa_oaep.py decrypt \
  --as   bob \
  --file ciphertext.json
```

Output:
```text
[OK] Signature valid (sender: alice)
[OK] Decryption successful

     Plaintext: Hello Bob, this is Alice. Sending you a secret.
```

### 4.3 Error Handling

The program handles the main failure cases explicitly:

- Message is not ASCII → `[ERR] Message must be ASCII.`
- Message exceeds 140 characters → `[ERR] Message too long (N chars). Max is 140.`
- Package is addressed to a different user → `[ERR] Package is for 'X', not 'Y'.`
- Signature check fails (tampered ciphertext or wrong sender) → `[ERR] Signature FAILED: ...`
- Decryption fails (wrong key or corrupted ciphertext) → `[ERR] Decryption FAILED: ...`

## 5. Sample Files

The repository includes pre-generated sample files so the program can be tested immediately without running keygen:

| File | Contents |
|---|---|
| `directory.json` | Alice and Bob's public keys (enc + sign) |
| `keys/alice_enc_private.pem` | Alice's RSA-2048 private enc key |
| `keys/alice_enc_public.pem` | Alice's RSA-2048 public enc key |
| `keys/alice_sign_private.pem` | Alice's RSA-2048 private signing key |
| `keys/alice_sign_public.pem` | Alice's RSA-2048 public signing key |
| `keys/bob_enc_private.pem` | Bob's RSA-2048 private enc key |
| `keys/bob_enc_public.pem` | Bob's RSA-2048 public enc key |
| `keys/bob_sign_private.pem` | Bob's RSA-2048 private signing key |
| `keys/bob_sign_public.pem` | Bob's RSA-2048 public signing key |
| `ciphertext.json` | A message from Alice to Bob, already encrypted and signed |

To verify everything works end-to-end with the sample files:

```bash
source venv/bin/activate
python3 rsa_oaep.py decrypt --as bob --file ciphertext.json
```

Expected output:
```text
[OK] Signature valid (sender: alice)
[OK] Decryption successful

     Plaintext: Hello this alice! im saying nonesense to you Bob
```

## 6. Design Decisions Summary

| Decision | Choice | Reason |
|---|---|---|
| Encryption scheme | RSA-OAEP / SHA-256 / MGF1-SHA-256 | Probabilistic, IND-CCA2 secure, avoids textbook RSA weaknesses |
| Signing scheme | RSA-PSS / SHA-256 / MAX salt | Provably secure, standard recommendation for RSA signatures |
| Key size | 2048-bit | Current NIST minimum for long-term RSA security |
| Key separation | Two distinct key pairs per user | Prevents cross-protocol attacks, standard practice |
| Auth scheme | Encrypt-then-Sign | Authenticates the ciphertext; prevents re-signing attacks |
| Verify ordering | Verify before decrypt | Never decrypt under an unauthenticated ciphertext |
| Public key store | `directory.json` | Models a trusted directory service; only public keys stored |
| Library | `pyca/cryptography` | Mature, OpenSSL-backed, no custom crypto |
| Message limit | 140 ASCII chars | Per spec; fits within OAEP's 190-byte limit for 2048-bit keys |

## 7. Summary

Here is a complete recap of what was built and why each piece exists:

1. **Key generation** — `keygen` creates RSA-2048 key pairs. Running it with `--type enc` produces a key pair for RSA-OAEP encryption. Running it with `--type sign` produces a separate key pair for RSA-PSS signing. Both are stored in `keys/`, and the public key is published to `directory.json`.

2. **Directory service** — `directory.json` acts as a trusted public-key store. It is the only place public keys are looked up during encrypt and decrypt operations. Private keys are never stored here.

3. **Encryption** — `encrypt` reads the recipient's public enc key from the directory, encrypts the plaintext under RSA-OAEP, then signs the ciphertext (not the plaintext) with the sender's private signing key under RSA-PSS. The result is saved as a JSON package.

4. **Decryption** — `decrypt` reads the sender's public signing key from the directory, verifies the signature over the ciphertext first, and only then decrypts using the recipient's private enc key. If the signature fails, execution stops before decryption begins.

This exercise made concrete the difference between encryption (confidentiality) and signing (authenticity), and illustrated why combining them in the right order — and with separate keys — is not just good practice but necessary to achieve both goals without undermining either.
