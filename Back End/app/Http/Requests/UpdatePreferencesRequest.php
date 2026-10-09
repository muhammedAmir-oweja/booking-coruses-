<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;   // any signed-in user may set their own display settings
    }

    /**
     * An allow-list per key. The cookie is written by our own SPA, but it still
     * arrives from the client, so it is untrusted input.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // in:, not string - an unknown locale would reach App::setLocale().
            'locale' => ['sometimes', 'in:en,ar'],
            'theme' => ['sometimes', 'in:light,dark'],
            'sidebar_collapsed' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'in:10,25,50,100'],
        ];
    }

    /**
     * validated() hands back whatever the client encoded, and form-encoded
     * bodies arrive as strings - so `sidebar_collapsed=1&per_page=25` would be
     * stored in the cookie as {"sidebar_collapsed":"1","per_page":"25"}. The
     * SPA's readPrefs() type-checks every field and would reject those,
     * silently falling back to defaults. Cast here so the cookie always holds
     * real JSON types no matter how the request was encoded.
     *
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): mixed
    {
        $data = parent::validated();

        if (array_key_exists('sidebar_collapsed', $data)) {
            $data['sidebar_collapsed'] = $this->boolean('sidebar_collapsed');
        }

        if (array_key_exists('per_page', $data)) {
            $data['per_page'] = (int) $data['per_page'];
        }

        return $key === null ? $data : data_get($data, $key, $default);
    }
}
