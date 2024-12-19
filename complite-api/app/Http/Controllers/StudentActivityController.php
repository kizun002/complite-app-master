<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Model;

class StudentActivityController extends Controller
{
    public function savePoints(Request $request)
{
    try {
        $validated = $request->validate([
            'points' => 'required|integer',
            'activityType' => 'required|string',
            'account_ID' => 'required|integer' // Add this to validate account_ID
        ]);

        // Debug log
        Log::info('Saving points request:', [
            'account_ID' => $validated['account_ID'],
            'points' => $validated['points'],
            'activityType' => $validated['activityType']
        ]);

        $studentProfile = DB::table('student_profile')
            ->where('account_ID', $validated['account_ID'])
            ->first();

        if (!$studentProfile) {
            Log::error('Student profile not found for account:', ['account_ID' => $validated['account_ID']]);
            return response()->json([
                'success' => false,
                'message' => "Student profile not found for account ID: {$validated['account_ID']}"
            ], 404);
        }

        // Update points
        $newPoints = $studentProfile->points + $validated['points'];
        
        DB::table('student_profile')
            ->where('account_ID', $validated['account_ID'])
            ->update(['points' => $newPoints]);

        return response()->json([
            'success' => true,
            'message' => 'Points saved successfully',
            'points' => $newPoints
        ]);

    } catch (\Exception $e) {
        Log::error('Error saving points: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to save points: ' . $e->getMessage()
        ], 500);
    }
}

    public function getActivities()
    {
        try {
            // Log the activities being retrieved
            $activities = Activity::all();
            Log::info('Activities retrieved:', $activities->toArray());

            return response()->json([
                'success' => true,
                'activities' => $activities
            ]);
        } catch (\Exception $e) {
            // Log the full error
            Log::error('Error fetching activities: ' . $e->getMessage());
            Log::error($e->getTraceAsString());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch activities: ' . $e->getMessage()
            ], 500);
        }
    }
}