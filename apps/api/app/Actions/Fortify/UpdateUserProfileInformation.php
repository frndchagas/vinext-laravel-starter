<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Notifications\EmailAddressChanged;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\UpdatesUserProfileInformation;

class UpdateUserProfileInformation implements UpdatesUserProfileInformation
{
    /**
     * @param  array<string, string>  $input
     *
     * @throws ValidationException
     */
    public function update(User $user, array $input): void
    {
        $emailChanged = array_key_exists('email', $input) && $input['email'] !== $user->email;

        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->getKey()),
            ],
            'current_password' => [
                Rule::requiredIf($emailChanged),
                'nullable',
                'string',
                'current_password:web',
            ],
        ], [
            'current_password.current_password' => __('The provided password does not match your current password.'),
        ])->validateWithBag('updateProfileInformation');

        if ($emailChanged) {
            $this->updateVerifiedUser($user, $input);

            return;
        }

        $user->forceFill([
            'name' => $input['name'],
            'email' => $input['email'],
        ])->save();
    }

    /**
     * @param  array<string, string>  $input
     */
    private function updateVerifiedUser(User $user, array $input): void
    {
        $previousEmail = $user->email;

        $user->forceFill([
            'name' => $input['name'],
            'email' => $input['email'],
            'email_verified_at' => null,
        ])->save();

        Notification::route('mail', $previousEmail)->notify(new EmailAddressChanged);
        $user->sendEmailVerificationNotification();
    }
}
