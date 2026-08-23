import "@typespec/http";
import "@typespec/openapi";

using Http;
using OpenAPI;

@service(#{ title: "Vinext Laravel Starter API" })
@info(#{ version: "1.0.0" })
namespace VinextLaravelStarter;

@doc("RFC 9457 problem details.")
model Problem {
  type: string;
  title: string;
  status: int32;
  detail?: string;
}

@doc("RFC 9457 problem details with a stable map of field validation errors.")
model ValidationProblem {
  ...Problem;
  errors: Record<string[]>;
}

@error
model UnauthorizedResponse {
  @statusCode statusCode: 401;
  @header contentType: "application/problem+json";
  @body body: Problem;
}

@error
model ForbiddenResponse {
  @statusCode statusCode: 403;
  @header contentType: "application/problem+json";
  @body body: Problem;
}

@error
model ValidationErrorResponse {
  @statusCode statusCode: 422;
  @header contentType: "application/problem+json";
  @body body: ValidationProblem;
}

@error
model NotFoundResponse {
  @statusCode statusCode: 404;
  @header contentType: "application/problem+json";
  @body body: Problem;
}

@error
model TooManyRequestsResponse {
  @statusCode statusCode: 429;
  @header contentType: "application/problem+json";
  @header("Retry-After") retryAfter?: string;
  @body body: Problem;
}

@doc("The authenticated identity, its roles and permissions.")
model Me {
  @doc("Opaque identifier. Clients must not infer meaning from its value.")
  id: string;

  name: string;
  email: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  two_factor_confirmed: boolean;
  roles: string[];
  permissions: string[];
}

model RegisterRequest extends Record<unknown> {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

model LoginRequest extends Record<unknown> {
  email: string;
  password: string;
  remember?: boolean;
}

model LoginResult {
  two_factor: boolean;
}

model AuthCapabilities {
  registration: boolean;
}

model UpdateProfileRequest extends Record<unknown> {
  name: string;
  email: string;
  @doc("Required when the email address changes.")
  current_password?: string;
}

model UpdatePasswordRequest extends Record<unknown> {
  current_password: string;
  password: string;
  password_confirmation: string;
}

model DeleteCurrentUserRequest extends Record<unknown> {
  password: string;
}

model TwoFactorChallengeRequest extends Record<unknown> {
  code?: string;
  recovery_code?: string;
}

model TwoFactorQrCode {
  svg: string;
  url: string;
}

model PasswordConfirmationStatus {
  confirmed: boolean;
}

model ForgotPasswordRequest extends Record<unknown> {
  email: string;
}

model ResetPasswordRequest extends Record<unknown> {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
}

model ConfirmPasswordRequest extends Record<unknown> {
  password: string;
}

model ConfirmTwoFactorRequest extends Record<unknown> {
  code: string;
}

@error
model PasswordConfirmationRequiredResponse {
  @statusCode statusCode: 423;
  @body body: StatusMessage;
}

model StatusMessage {
  message: string;
}

@tag("Auth")
@route("/api/v1/auth")
namespace Auth {
  @operationId("register")
  @doc("Register a new user. Controlled by the registration feature flag.")
  @route("/register")
  @post
  op register(@body body: RegisterRequest):
    | CreatedResponse
    | ForbiddenResponse
    | TooManyRequestsResponse
    | ValidationErrorResponse;

  @operationId("login")
  @route("/login")
  @post
  op login(@body body: LoginRequest): {
    @statusCode statusCode: 200;
    @body body: LoginResult;
  } | ValidationErrorResponse | TooManyRequestsResponse;

  @operationId("getAuthCapabilities")
  @doc("Public authentication capabilities controlled by Laravel deployment configuration.")
  @route("/capabilities")
  @get
  op getAuthCapabilities(): {
    @statusCode statusCode: 200;
    @body body: AuthCapabilities;
  };

  @operationId("logout")
  @route("/logout")
  @post
  op logout(): NoContentResponse | UnauthorizedResponse;

  @operationId("forgotPassword")
  @route("/forgot-password")
  @post
  op forgotPassword(@body body: ForgotPasswordRequest): {
    @statusCode statusCode: 200;
    @body body: StatusMessage;
  } | ValidationErrorResponse | TooManyRequestsResponse;

  @operationId("resetPassword")
  @route("/reset-password")
  @post
  op resetPassword(@body body: ResetPasswordRequest): {
    @statusCode statusCode: 200;
    @body body: StatusMessage;
  } | ValidationErrorResponse;

  @operationId("resendEmailVerification")
  @doc("Resend the email verification notification to the authenticated user.")
  @route("/email/verification-notification")
  @post
  op resendEmailVerification(): AcceptedResponse | UnauthorizedResponse | TooManyRequestsResponse;

  @operationId("verifyEmail")
  @doc("Verify the authenticated user's email through a temporary signed link and redirect to the SPA.")
  @route("/email/verify/{id}/{hash}")
  @get
  op verifyEmail(
    @path id: string,
    @path hash: string,
    @query expires?: int64,
    @query signature?: string,
  ): {
    @statusCode statusCode: 302;
    @header location: string;
  } | UnauthorizedResponse | ForbiddenResponse | TooManyRequestsResponse;

  @operationId("updateProfile")
  @route("/user/profile-information")
  @put
  op updateProfile(@body body: UpdateProfileRequest): {
    @statusCode statusCode: 200;
  } | ValidationErrorResponse | UnauthorizedResponse;

  @operationId("updatePassword")
  @route("/user/password")
  @put
  op updatePassword(@body body: UpdatePasswordRequest): {
    @statusCode statusCode: 200;
  } | ValidationErrorResponse | UnauthorizedResponse;

  @operationId("deleteCurrentUser")
  @doc("Permanently delete the authenticated User and resources owned only by that identity.")
  @route("/user")
  @delete
  op deleteCurrentUser(@body body: DeleteCurrentUserRequest):
    | NoContentResponse
    | ConflictResponse
    | ValidationErrorResponse
    | UnauthorizedResponse;

  @operationId("confirmPassword")
  @route("/user/confirm-password")
  @post
  op confirmPassword(@body body: ConfirmPasswordRequest): {
    @statusCode statusCode: 201;
  } | ValidationErrorResponse | UnauthorizedResponse;

  @operationId("getPasswordConfirmationStatus")
  @route("/user/confirmed-password-status")
  @get
  op getPasswordConfirmationStatus(): {
    @statusCode statusCode: 200;
    @body body: PasswordConfirmationStatus;
  } | UnauthorizedResponse;

  @operationId("enableTwoFactor")
  @route("/user/two-factor-authentication")
  @post
  op enableTwoFactor(): {
    @statusCode statusCode: 200;
  } | PasswordConfirmationRequiredResponse | UnauthorizedResponse;

  @operationId("confirmTwoFactor")
  @route("/user/confirmed-two-factor-authentication")
  @post
  op confirmTwoFactor(@body body: ConfirmTwoFactorRequest): {
    @statusCode statusCode: 200;
  } | ValidationErrorResponse | PasswordConfirmationRequiredResponse | UnauthorizedResponse;

  @operationId("disableTwoFactor")
  @route("/user/two-factor-authentication")
  @delete
  op disableTwoFactor(): {
    @statusCode statusCode: 200;
  } | PasswordConfirmationRequiredResponse | UnauthorizedResponse;

  @operationId("getTwoFactorQrCode")
  @route("/user/two-factor-qr-code")
  @get
  op getTwoFactorQrCode(): {
    @statusCode statusCode: 200;
    @body body: TwoFactorQrCode;
  } | PasswordConfirmationRequiredResponse | UnauthorizedResponse;

  @operationId("getTwoFactorSecretKey")
  @route("/user/two-factor-secret-key")
  @get
  op getTwoFactorSecretKey(): {
    @statusCode statusCode: 200;
    @body body: {
      secretKey: string;
    };
  } | PasswordConfirmationRequiredResponse | UnauthorizedResponse | NotFoundResponse;

  @operationId("getRecoveryCodes")
  @route("/user/two-factor-recovery-codes")
  @get
  op getRecoveryCodes(): {
    @statusCode statusCode: 200;
    @body body: string[];
  } | PasswordConfirmationRequiredResponse | UnauthorizedResponse;

  @operationId("regenerateRecoveryCodes")
  @route("/user/two-factor-recovery-codes")
  @post
  op regenerateRecoveryCodes(): {
    @statusCode statusCode: 200;
  } | PasswordConfirmationRequiredResponse | UnauthorizedResponse;

  @operationId("completeTwoFactorChallenge")
  @route("/two-factor-challenge")
  @post
  op completeTwoFactorChallenge(@body body: TwoFactorChallengeRequest):
    | NoContentResponse
    | ValidationErrorResponse
    | TooManyRequestsResponse;
}

@tag("Identity")
namespace Identity {
  @operationId("getMe")
  @doc("Current authenticated identity with roles, permissions and verification state.")
  @route("/api/v1/me")
  @get
  op getMe(): {
    @statusCode statusCode: 200;
    @body body: Me;
  } | UnauthorizedResponse;
}

union AdminUserRole {
  "member",
  "admin",
}

model AdminUser {
  @doc("Opaque identifier. Clients must not infer meaning from its value.")
  id: string;

  name: string;
  email: string;
  email_verified: boolean;
  roles: AdminUserRole[];
  created_at: utcDateTime;
}

model AdminUserPage {
  data: AdminUser[];
  meta: {
    next_cursor: string | null;
    prev_cursor: string | null;
  };
}

model UpdateAdminUserRoleRequest extends Record<unknown> {
  role: AdminUserRole;
}

@tag("Administration")
@route("/api/v1/admin/users")
namespace Administration {
  @operationId("listAdminUsers")
  @doc("Search and cursor-page through safe User identity and role metadata. Requires users.view.")
  @get
  op listAdminUsers(
    @query search?: string,
    @query cursor?: string,
    @query per_page?: int32,
  ): {
    @statusCode statusCode: 200;
    @body body: AdminUserPage;
  } | UnauthorizedResponse | ForbiddenResponse;

  @operationId("updateAdminUserRole")
  @doc("Replace another User's canonical role. Requires users.manage.")
  @route("/{id}/role")
  @patch
  op updateAdminUserRole(
    @path id: string,
    @body body: UpdateAdminUserRoleRequest,
  ): {
    @statusCode statusCode: 200;
    @body body: AdminUser;
  } | ConflictResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse;
}

@tag("Infrastructure")
namespace Infrastructure {
  @operationId("getCsrfCookie")
  @doc("Issue the CSRF cookie required before state-changing requests.")
  @route("/sanctum/csrf-cookie")
  @get
  op getCsrfCookie(): NoContentResponse;
}

union TaskState {
  "queued",
  "processing",
  "completed",
  "failed",
}

model TaskOutput {
  word_count: int32;
  reversed: string;
}

@doc("Reference asynchronous resource. The persisted state is the source of truth.")
model Task {
  @doc("Opaque identifier. Clients must not infer meaning from its value.")
  id: string;

  input: string;
  output: TaskOutput | null;
  state: TaskState;
  version: int32;
  error_code: string | null;
  correlation_id: string;
  started_at: utcDateTime | null;
  finished_at: utcDateTime | null;
  created_at: utcDateTime;
}

model CreateTaskRequest extends Record<unknown> {
  @maxLength(10000)
  input: string;
}

model TaskPage {
  data: Task[];
  meta: {
    next_cursor: string | null;
    prev_cursor: string | null;
  };
}

@error
model ConflictResponse {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: {
    ...Problem;
    code: string;
  };
}

@tag("Tasks")
@route("/api/v1/tasks")
namespace Tasks {
  @operationId("createTask")
  @doc("Create a Task and queue its processing. Requires a verified email and an Idempotency-Key header; repeating the key with the same payload replays the first response, and a different payload returns 409 with code idempotency_key_reused.")
  @post
  op createTask(
    @header("Idempotency-Key") idempotencyKey: string,
    @body body: CreateTaskRequest,
  ): {
    @statusCode statusCode: 202;
    @header("Location") location: string;
    @body body: Task;
  } | ConflictResponse | ValidationErrorResponse | UnauthorizedResponse | ForbiddenResponse;

  @operationId("listTasks")
  @doc("Cursor-paginated list of the authenticated user's Tasks, newest first.")
  @get
  op listTasks(@query cursor?: string, @query per_page?: int32): {
    @statusCode statusCode: 200;
    @body body: TaskPage;
  } | UnauthorizedResponse | ForbiddenResponse;

  @operationId("getTask")
  @route("/{id}")
  @get
  op getTask(@path id: string): {
    @statusCode statusCode: 200;
    @body body: Task;
  } | UnauthorizedResponse | ForbiddenResponse | NotFoundResponse;
}
