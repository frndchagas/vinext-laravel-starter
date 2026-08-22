/**
 * Generated from contracts/http/openapi/openapi.yaml.
 * Do not edit manually.
 */
import * as zod from "zod";

import {
  CreateTaskResponse,
  ForgotPasswordResponse,
  GetAuthCapabilitiesResponse,
  GetMeResponse,
  GetPasswordConfirmationStatusResponse,
  GetRecoveryCodesResponse,
  GetTaskResponse,
  GetTwoFactorQrCodeResponse,
  GetTwoFactorSecretKeyResponse,
  ListAdminUsersResponse,
  ListTasksResponse,
  LoginResponse,
  ResetPasswordResponse,
  UpdateAdminUserRoleResponse,
} from "./zod";

const EmptyResponse = zod.undefined();
const ListAdminUsersResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ListAdminUsersResponse403 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const UpdateAdminUserRoleResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const UpdateAdminUserRoleResponse403 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const UpdateAdminUserRoleResponse404 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const UpdateAdminUserRoleResponse409 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  code: zod.string(),
});
const UpdateAdminUserRoleResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const ResendEmailVerificationResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ResendEmailVerificationResponse429 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const VerifyEmailResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const VerifyEmailResponse403 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const VerifyEmailResponse429 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ForgotPasswordResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const ForgotPasswordResponse429 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const LoginResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const LoginResponse429 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const LogoutResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const RegisterResponse403 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const RegisterResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const RegisterResponse429 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ResetPasswordResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const CompleteTwoFactorChallengeResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const CompleteTwoFactorChallengeResponse429 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const DeleteCurrentUserResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const DeleteCurrentUserResponse409 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  code: zod.string(),
});
const DeleteCurrentUserResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const ConfirmPasswordResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ConfirmPasswordResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const GetPasswordConfirmationStatusResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ConfirmTwoFactorResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ConfirmTwoFactorResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const ConfirmTwoFactorResponse423 = zod.object({
  message: zod.string(),
});
const UpdatePasswordResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const UpdatePasswordResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const UpdateProfileResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const UpdateProfileResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const EnableTwoFactorResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const EnableTwoFactorResponse423 = zod.object({
  message: zod.string(),
});
const DisableTwoFactorResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const DisableTwoFactorResponse423 = zod.object({
  message: zod.string(),
});
const GetTwoFactorQrCodeResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const GetTwoFactorQrCodeResponse423 = zod.object({
  message: zod.string(),
});
const GetRecoveryCodesResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const GetRecoveryCodesResponse423 = zod.object({
  message: zod.string(),
});
const RegenerateRecoveryCodesResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const RegenerateRecoveryCodesResponse423 = zod.object({
  message: zod.string(),
});
const GetTwoFactorSecretKeyResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const GetTwoFactorSecretKeyResponse404 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const GetTwoFactorSecretKeyResponse423 = zod.object({
  message: zod.string(),
});
const GetMeResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const CreateTaskResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const CreateTaskResponse403 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const CreateTaskResponse409 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  code: zod.string(),
});
const CreateTaskResponse422 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
  errors: zod.object({}).catchall(zod.array(zod.string())),
});
const ListTasksResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const ListTasksResponse403 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const GetTaskResponse401 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const GetTaskResponse403 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});
const GetTaskResponse404 = zod.object({
  type: zod.string(),
  title: zod.string(),
  status: zod.number().int().min(-2147483648).max(2147483647),
  detail: zod.string().optional(),
});

export const responseContracts = [
  {
    operationId: "listAdminUsers",
    method: "GET",
    path: /^\/api\/v1\/admin\/users$/,
    responses: {
      200: ListAdminUsersResponse,
      401: ListAdminUsersResponse401,
      403: ListAdminUsersResponse403,
    },
  },
  {
    operationId: "updateAdminUserRole",
    method: "PATCH",
    path: /^\/api\/v1\/admin\/users\/[^/]+\/role$/,
    responses: {
      200: UpdateAdminUserRoleResponse,
      401: UpdateAdminUserRoleResponse401,
      403: UpdateAdminUserRoleResponse403,
      404: UpdateAdminUserRoleResponse404,
      409: UpdateAdminUserRoleResponse409,
      422: UpdateAdminUserRoleResponse422,
    },
  },
  {
    operationId: "getAuthCapabilities",
    method: "GET",
    path: /^\/api\/v1\/auth\/capabilities$/,
    responses: {
      200: GetAuthCapabilitiesResponse,
    },
  },
  {
    operationId: "resendEmailVerification",
    method: "POST",
    path: /^\/api\/v1\/auth\/email\/verification-notification$/,
    responses: {
      202: EmptyResponse,
      401: ResendEmailVerificationResponse401,
      429: ResendEmailVerificationResponse429,
    },
  },
  {
    operationId: "verifyEmail",
    method: "GET",
    path: /^\/api\/v1\/auth\/email\/verify\/[^/]+\/[^/]+$/,
    responses: {
      302: EmptyResponse,
      401: VerifyEmailResponse401,
      403: VerifyEmailResponse403,
      429: VerifyEmailResponse429,
    },
  },
  {
    operationId: "forgotPassword",
    method: "POST",
    path: /^\/api\/v1\/auth\/forgot-password$/,
    responses: {
      200: ForgotPasswordResponse,
      422: ForgotPasswordResponse422,
      429: ForgotPasswordResponse429,
    },
  },
  {
    operationId: "login",
    method: "POST",
    path: /^\/api\/v1\/auth\/login$/,
    responses: {
      200: LoginResponse,
      422: LoginResponse422,
      429: LoginResponse429,
    },
  },
  {
    operationId: "logout",
    method: "POST",
    path: /^\/api\/v1\/auth\/logout$/,
    responses: {
      204: EmptyResponse,
      401: LogoutResponse401,
    },
  },
  {
    operationId: "register",
    method: "POST",
    path: /^\/api\/v1\/auth\/register$/,
    responses: {
      201: EmptyResponse,
      403: RegisterResponse403,
      422: RegisterResponse422,
      429: RegisterResponse429,
    },
  },
  {
    operationId: "resetPassword",
    method: "POST",
    path: /^\/api\/v1\/auth\/reset-password$/,
    responses: {
      200: ResetPasswordResponse,
      422: ResetPasswordResponse422,
    },
  },
  {
    operationId: "completeTwoFactorChallenge",
    method: "POST",
    path: /^\/api\/v1\/auth\/two-factor-challenge$/,
    responses: {
      204: EmptyResponse,
      422: CompleteTwoFactorChallengeResponse422,
      429: CompleteTwoFactorChallengeResponse429,
    },
  },
  {
    operationId: "deleteCurrentUser",
    method: "DELETE",
    path: /^\/api\/v1\/auth\/user$/,
    responses: {
      204: EmptyResponse,
      401: DeleteCurrentUserResponse401,
      409: DeleteCurrentUserResponse409,
      422: DeleteCurrentUserResponse422,
    },
  },
  {
    operationId: "confirmPassword",
    method: "POST",
    path: /^\/api\/v1\/auth\/user\/confirm-password$/,
    responses: {
      201: EmptyResponse,
      401: ConfirmPasswordResponse401,
      422: ConfirmPasswordResponse422,
    },
  },
  {
    operationId: "getPasswordConfirmationStatus",
    method: "GET",
    path: /^\/api\/v1\/auth\/user\/confirmed-password-status$/,
    responses: {
      200: GetPasswordConfirmationStatusResponse,
      401: GetPasswordConfirmationStatusResponse401,
    },
  },
  {
    operationId: "confirmTwoFactor",
    method: "POST",
    path: /^\/api\/v1\/auth\/user\/confirmed-two-factor-authentication$/,
    responses: {
      200: EmptyResponse,
      401: ConfirmTwoFactorResponse401,
      422: ConfirmTwoFactorResponse422,
      423: ConfirmTwoFactorResponse423,
    },
  },
  {
    operationId: "updatePassword",
    method: "PUT",
    path: /^\/api\/v1\/auth\/user\/password$/,
    responses: {
      200: EmptyResponse,
      401: UpdatePasswordResponse401,
      422: UpdatePasswordResponse422,
    },
  },
  {
    operationId: "updateProfile",
    method: "PUT",
    path: /^\/api\/v1\/auth\/user\/profile-information$/,
    responses: {
      200: EmptyResponse,
      401: UpdateProfileResponse401,
      422: UpdateProfileResponse422,
    },
  },
  {
    operationId: "enableTwoFactor",
    method: "POST",
    path: /^\/api\/v1\/auth\/user\/two-factor-authentication$/,
    responses: {
      200: EmptyResponse,
      401: EnableTwoFactorResponse401,
      423: EnableTwoFactorResponse423,
    },
  },
  {
    operationId: "disableTwoFactor",
    method: "DELETE",
    path: /^\/api\/v1\/auth\/user\/two-factor-authentication$/,
    responses: {
      200: EmptyResponse,
      401: DisableTwoFactorResponse401,
      423: DisableTwoFactorResponse423,
    },
  },
  {
    operationId: "getTwoFactorQrCode",
    method: "GET",
    path: /^\/api\/v1\/auth\/user\/two-factor-qr-code$/,
    responses: {
      200: GetTwoFactorQrCodeResponse,
      401: GetTwoFactorQrCodeResponse401,
      423: GetTwoFactorQrCodeResponse423,
    },
  },
  {
    operationId: "getRecoveryCodes",
    method: "GET",
    path: /^\/api\/v1\/auth\/user\/two-factor-recovery-codes$/,
    responses: {
      200: GetRecoveryCodesResponse,
      401: GetRecoveryCodesResponse401,
      423: GetRecoveryCodesResponse423,
    },
  },
  {
    operationId: "regenerateRecoveryCodes",
    method: "POST",
    path: /^\/api\/v1\/auth\/user\/two-factor-recovery-codes$/,
    responses: {
      200: EmptyResponse,
      401: RegenerateRecoveryCodesResponse401,
      423: RegenerateRecoveryCodesResponse423,
    },
  },
  {
    operationId: "getTwoFactorSecretKey",
    method: "GET",
    path: /^\/api\/v1\/auth\/user\/two-factor-secret-key$/,
    responses: {
      200: GetTwoFactorSecretKeyResponse,
      401: GetTwoFactorSecretKeyResponse401,
      404: GetTwoFactorSecretKeyResponse404,
      423: GetTwoFactorSecretKeyResponse423,
    },
  },
  {
    operationId: "getMe",
    method: "GET",
    path: /^\/api\/v1\/me$/,
    responses: {
      200: GetMeResponse,
      401: GetMeResponse401,
    },
  },
  {
    operationId: "createTask",
    method: "POST",
    path: /^\/api\/v1\/tasks$/,
    responses: {
      202: CreateTaskResponse,
      401: CreateTaskResponse401,
      403: CreateTaskResponse403,
      409: CreateTaskResponse409,
      422: CreateTaskResponse422,
    },
  },
  {
    operationId: "listTasks",
    method: "GET",
    path: /^\/api\/v1\/tasks$/,
    responses: {
      200: ListTasksResponse,
      401: ListTasksResponse401,
      403: ListTasksResponse403,
    },
  },
  {
    operationId: "getTask",
    method: "GET",
    path: /^\/api\/v1\/tasks\/[^/]+$/,
    responses: {
      200: GetTaskResponse,
      401: GetTaskResponse401,
      403: GetTaskResponse403,
      404: GetTaskResponse404,
    },
  },
  {
    operationId: "getCsrfCookie",
    method: "GET",
    path: /^\/sanctum\/csrf-cookie$/,
    responses: {
      204: EmptyResponse,
    },
  },
] as const;
