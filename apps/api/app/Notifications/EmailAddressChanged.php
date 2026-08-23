<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class EmailAddressChanged extends Notification
{
    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your email address was changed')
            ->line('The email address used to sign in to your account was changed.')
            ->line('If you did not make this change, reset your password now.')
            ->action('Secure your account', rtrim((string) config('app.url'), '/').'/forgot-password');
    }
}
