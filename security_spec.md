# Security Specification - IT Monitoring App

## Data Invariants
- **Users**: A user profile must be linked to their authenticated UID. Roles must be one of the defined set.
- **Tasks**: Every task must have a title and be assigned to a valid user.
- **Daily Reports**: Must be linked to the current user's UID. Progress and status must follow defined rules.
- **Locations**: Only Head of IT, Administrator, or IT Admin can create/edit/delete locations. Any authenticated user can read them.
- **Assets/CCTV**: Only Head of IT, Administrator, or IT Admin can write (create/update/delete). Any authenticated user can read.

## The "Dirty Dozen" Payloads

1. **Identity Spoofing - User Profile**: Authenticated User A attempts to update User B's profile.
   - Target: `/users/{userB_UID}`
   - Action: `update`
   - Expected: `PERMISSION_DENIED`

2. **Privilege Escalation - Role Change**: User attempts to change their own role to `head_of_it`, `administrator`, or `it_admin`.
   - Target: `/users/{current_UID}`
   - Payload: `{ "role": "head_of_it" }`
   - Expected: `PERMISSION_DENIED` (only admins/managers should be able to change roles, or roles should be immutable after setup).

3. **Status Hijacking - Final State**: Attempt to update a `completed` task's title.
   - Target: `/tasks/{taskID}` (where task status is 'completed')
   - Expected: `PERMISSION_DENIED`

4. **Resource Poisoning - Huge String**: Attempt to set a task description with 2MB of text.
   - Payload: `{ "description": "..." }` (2MB)
   - Expected: `PERMISSION_DENIED`

5. **Orphaned Write - Report without Task**: Creating a daily report with a random string as `task_id` (not existing).
   - Expected: `PERMISSION_DENIED` (if relational validation is possible via `exists()`).

6. **Unauthorized Access - Locations Write**: Staff User attempts to create a location.
   - Expected: `PERMISSION_DENIED`

7. **Shadow Field injection**: Attempt to add `is_admin: true` to a task document.
   - Expected: `PERMISSION_DENIED`

8. **PII Leakage - User Read**: Authenticated user attempts to list all user profiles with WA numbers.
   - Expected: `PERMISSION_DENIED` (if PII isolation is enforced).

9. **Invalid Data Type**: Sending a string for a task's `progress` number.
   - Payload: `{ "progress": "50%" }`
   - Expected: `PERMISSION_DENIED`

10. **Temporal Integrity - Fake Timestamp**: User sends a hardcoded past `created_at` date.
    - Expected: `PERMISSION_DENIED` (must use `request.time`).

11. **Negative Progress**: Setting task progress to `-50`.
    - Expected: `PERMISSION_DENIED`

12. **ID Poisoning**: Attempting to create a document with a 2KB long ID string.
    - Expected: `PERMISSION_DENIED` (via `isValidId` helper).

## Test Runner - `firestore.rules.test.ts`
(Note: This is a representation of the tests to be run)
- `test('Only Head of IT, Administrator, or IT Admin can create locations', ...)`
- `test('Users can only write their own daily reports', ...)`
- `test('Tasks must have valid progress (0-100)', ...)`
- `test('Admins can view all collections', ...)`
