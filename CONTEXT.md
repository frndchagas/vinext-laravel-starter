# Domain context

This glossary records terms whose meaning must stay stable across documentation, contracts, code, and interface.

## Product scope

**Vinext Laravel Starter**: public name of the agent-ready Laravel and Vinext source template.

_Avoid_: `Vinext AI Starter`, `AI SaaS starter`

**Agent-ready foundation**: source template whose instructions, boundaries and executable gates let coding agents build an application safely. It does not imply an AI provider or AI behavior in the running application.

_Avoid_: `AI application starter`

**Primary adopter**: experienced Laravel developer or small product team that uses coding agents and wants a React server-component interface with explicit backend contracts.

_Avoid_: `Laravel beginner`, `no-code user`, `platform team`

## Identity and authorization

**User**: authenticated identity maintained by Laravel. Represents the person who starts a session and receives roles and permissions.

_Avoid_: `Member` as a synonym for the authenticated person.

**Account**: user-facing label for the access, security and settings attached to one `User`. It is not a separate persisted domain entity.

_Avoid_: using `Account` for a collective tenant.

**Organization**: reserved term for a future collective tenant with multiple Users. Organizations are not part of the starter core.

**member**: default role assigned to a `User`. It is not a different kind of user.

**admin**: administrative role assigned to a `User`. The role does not replace Policies and Gates in authorizing actions.

**User administration**: reference administrative vertical for listing Users and changing their `member` or `admin` role. It exists to prove role- and permission-based authorization end to end.

**Last admin**: the only remaining User with the `admin` role. That User cannot be demoted or delete their Account, which preserves an administrative recovery path.

**User deletion**: permanent removal of a `User` and every resource owned only by that identity. The starter defines no retention or anonymization period.

_UI label_: `Delete account`

## Request tracing

**Correlation ID**: identifier attached to an HTTP request and response for tracing application work.
