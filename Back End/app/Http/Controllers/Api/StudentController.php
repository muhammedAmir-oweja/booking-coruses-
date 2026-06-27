<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StudentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Student::query();

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('email', 'like', '%' . $request->search . '%')
                  ->orWhere('phone', 'like', '%' . $request->search . '%');
            });
        }

        $perPage = min((int) $request->get('per_page', 10), 200);
        $students = $query->latest()->paginate($perPage);

        $students->getCollection()->transform(fn($s) => $this->format($s));

        return response()->json($students);
    }

    public function show(Student $student): JsonResponse
    {
        return response()->json($this->format($student));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'email'         => ['required', 'email', 'unique:students,email'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'address'       => ['nullable', 'string'],
            'photo'         => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('photo')) {
            $data['photo'] = $request->file('photo')->store('students', 'public');
        }

        $student = Student::create($data);

        return response()->json($this->format($student), 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['sometimes', 'string', 'max:255'],
            'email'         => ['sometimes', 'email', 'unique:students,email,' . $student->id],
            'phone'         => ['nullable', 'string', 'max:20'],
            'date_of_birth' => ['nullable', 'date'],
            'address'       => ['nullable', 'string'],
            'photo'         => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('photo')) {
            if ($student->photo) {
                Storage::disk('public')->delete($student->photo);
            }
            $data['photo'] = $request->file('photo')->store('students', 'public');
        }

        $student->update($data);

        return response()->json($this->format($student));
    }

    public function destroy(Student $student): JsonResponse
    {
        if ($student->photo) {
            Storage::disk('public')->delete($student->photo);
        }

        $student->delete();

        return response()->json(['message' => 'Student deleted successfully.']);
    }

    private function format(Student $student): array
    {
        return [
            'id'            => $student->id,
            'name'          => $student->name,
            'email'         => $student->email,
            'phone'         => $student->phone,
            'date_of_birth' => $student->date_of_birth?->toDateString(),
            'address'       => $student->address,
            'photo_url'     => $student->photo_url,
            'created_at'    => $student->created_at,
        ];
    }
}
