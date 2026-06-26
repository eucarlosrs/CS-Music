# Security Specification: CS Music

## 1. Data Invariants
1. **User profiles (`/users/{userId}`)**: Users can only read and write their own profile docs (`userId == request.auth.uid`). Users can never toggle their own role field `isAdmin: true` without security vetting.
2. **Songs (`/songs/{songId}`)**: Read access is public (signed-in or guest users can catalog/play songs). Writes (create, update, delete) are strictly permitted ONLY for verified admins.
3. **Playlists (`/playlists/{playlistId}`)**: Public playlists created by "system" are read-only to users. Custom playlists can be created/read/updated/deleted by the creator (`createdBy == request.auth.uid`).
4. **Licensing Requests (`/licensing_requests/{requestId}`)**: Requesters can submit a form (authenticated or guest, or authenticated check depending on setup; let's allow any authenticated user or general user to write, but reading is strictly restricted to Admins).

---

## 2. The "Dirty Dozen" Malicious Payloads

### Test 1: Identity Spoofing — Modifying Another User's Metadata
An attacker attempts to write directly into `/users/anotherUserUID` to toggle favorites or listening history on behalf of someone else.
```json
{
  "uid": "anotherUserUID",
  "email": "attacker@victim.com",
  "likedSongs": ["maliciousId"]
}
```

### Test 2: Privilege Escalation — Elevating Self to Admin
An authenticated user attempts to write to their own profile and inject `isAdmin: true`.
```json
{
  "uid": "victimUID",
  "email": "victim@gmail.com",
  "isAdmin": true
}
```

### Test 3: Song Catalogue Poisoning — Unauthorized Insert by Non-Admin
A normal user tries to insert a custom song URL directly into the global `/songs` collection.
```json
{
  "id": "newSong",
  "name": "Malicious Song",
  "artist": "CS Estúdio",
  "audioUrl": "https://malicious.club/virus.mp3"
}
```

### Test 4: Resource Poisoning — Overriding an Existing Track
A non-admin attempts to send an `update` packet to change an audio URL to a phishing domain.
```json
{
  "audioUrl": "https://phishing-site.com/hijacked"
}
```

### Test 5: Infinite Value Injection — Extremely Large String payload
Attacker tries to inject a 10MB lyric string to cause a service outage or exhaust database limits.
```json
{
  "lyrics": "Repeated extremely large payload..."
}
```

### Test 6: Ghost Fields Injection in User Doc
Attacker sends a request with valid fields plus a hidden shadow state field `isGoldVIP: true` to bypass payment gates.
```json
{
  "uid": "attackerUID",
  "email": "attacker@gmail.com",
  "isGoldVIP": true
}
```

### Test 7: Unauthorized Playlist Deletion
Attacker tries to delete a public system playlist.
```json
{
  "id": "systemPopular"
}
```

### Test 8: PII Blanket Read Exposure
Attacker tries to inspect `/licensing_requests` without administrative authorization.
```json
{
  "query": "select * from requests"
}
```

### Test 9: Tampering with Licensing Request Status
Attacker tries to set status of an existing request directly to `Fechado` or `Em andamento` to skew business operations.
```json
{
  "status": "Fechado"
}
```

### Test 10: Invalid ID Injection on Document Names
Attacker attempts to create a song with a weird 2KB ID to choke standard query executions.
```json
{
  "id": "a-very-long-id-constructed-with-junk-characters-...."
}
```

### Test 11: Future/Past Timestamp Manipulation
An attacker attempts to set `createdAt` in the future to keep a licensing request prioritized.
```json
{
  "createdAt": "2035-01-01T00:00:00Z"
}
```

### Test 12: Orphaned Licensing Reference Creation
An attacker submits a Licensing Request for a song that does not exist in `/songs` to clutter requests and cause rendering crashes.
```json
{
  "songId": "fakeSongId",
  "fullName": "Imposter Tester"
}
```

---

## 3. Security Rules Draft (TDD Verification)

We will implement standard, high-performance rule patterns in `firestore.rules`.
All tests must result in `PERMISSION_DENIED` for unauthorized actions, keeping the fortress perfectly secure.
