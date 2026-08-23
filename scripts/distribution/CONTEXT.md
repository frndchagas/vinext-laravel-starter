# Domain context

This snapshot starts with the terms below. Keep their meaning consistent across documentation, contracts, code and interface, then replace or extend them deliberately as the product domain develops.

## Identity and authorization

**User**: authenticated identity maintained by Laravel. Represents the person who starts a session and receives roles and permissions.

_Avoid_: `Member` as a synonym for the authenticated person.

**Account**: user-facing label for the access, security and settings attached to one `User`. It is not a separate persisted domain entity.

_Avoid_: using `Account` for a collective tenant.

**Organization**: reserved term for a future collective tenant with multiple Users. Organizations are not implemented in this snapshot.

**member**: default role assigned to a `User`. It is not a different kind of User.

**admin**: administrative role assigned to a `User`. The role does not replace Policies and Gates in authorizing actions.

**User administration**: reference administrative flow for listing Users and changing their `member` or `admin` role. It demonstrates role- and permission-based authorization end to end.

**Last admin**: the only remaining User with the `admin` role. That User cannot be demoted or delete their Account, preserving an administrative recovery path.

**User deletion**: the current implementation permanently removes a `User` and resources owned only by that identity. Define any retention, audit or anonymization policy required by the product before launch.

_UI label_: `Delete account`

## Reference asynchronous flow

**Task**: pedagogical resource included to demonstrate the asynchronous path. A Task belongs to one `User`, moves through `queued`, `processing`, `completed` or `failed`, and treats persisted state as authoritative over delivery attempts and realtime notifications. Replace it with a product concept or remove the complete vertical when it is no longer useful.

**Idempotency Key**: opaque string a client sends with a mutating request so a retry cannot create a second logical operation. It is scoped to a `User` and an operation name.

**Correlation ID**: identifier that relates one HTTP request to Task processing and realtime notifications.
