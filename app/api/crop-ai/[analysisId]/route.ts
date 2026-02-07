import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CropAnalysis from '@/models/CropAnalysis';

// GET /api/crop-ai/[analysisId]
// Get a single analysis by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    await dbConnect();

    const { analysisId } = await params;

    // Validate analysisId format
    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid analysis ID format' },
        { status: 400 }
      );
    }

    // Authenticate user
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find analysis by ID
    const analysis = await CropAnalysis.findById(analysisId).lean();

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (analysis.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Access denied. This analysis belongs to another user.' },
        { status: 403 }
      );
    }

    // Format response data
    const responseData = {
      id: analysis._id.toString(),
      userId: analysis.userId.toString(),
      imageUrl: analysis.imageUrl,
      imageThumbnail: analysis.imageThumbnail || analysis.imageUrl,
      overallHealth: analysis.overallHealth,
      healthScore: analysis.healthScore,
      cropType: analysis.cropType,
      cropGrowthStage: analysis.cropGrowthStage,
      diseases: analysis.diseases || [],
      nutrientDeficiencies: analysis.nutrientDeficiencies || [],
      pests: analysis.pests || [],
      weatherSuggestions: analysis.weatherSuggestions || {
        current: [],
        upcoming: [],
        rainPreparation: [],
      },
      yieldSuggestions: analysis.yieldSuggestions || [],
      location: analysis.location ? {
        state: analysis.location.state,
        district: analysis.location.district,
        coordinates: analysis.location.coordinates,
      } : null,
      analysisDate: analysis.analysisDate.toISOString(),
      weather: analysis.weather ? {
        temperature: analysis.weather.temperature,
        feelsLike: analysis.weather.feelsLike,
        humidity: analysis.weather.humidity,
        condition: analysis.weather.condition,
        icon: analysis.weather.icon,
        windSpeed: analysis.weather.windSpeed,
        forecast: analysis.weather.forecast || [],
      } : null,
      userNotes: analysis.userNotes,
      status: analysis.status,
      errorMessage: analysis.errorMessage,
      createdAt: analysis.createdAt.toISOString(),
      updatedAt: analysis.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('Get analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analysis',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/crop-ai/[analysisId]
// Delete an analysis by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    await dbConnect();

    const { analysisId } = await params;

    // Validate analysisId format
    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid analysis ID format' },
        { status: 400 }
      );
    }

    // Authenticate user
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Find analysis by ID
    const analysis = await CropAnalysis.findById(analysisId);

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (analysis.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Access denied. This analysis belongs to another user.' },
        { status: 403 }
      );
    }

    // Note: Images are stored as base64 in MongoDB, no external storage cleanup needed

    // Delete the analysis document
    await CropAnalysis.findByIdAndDelete(analysisId);

    return NextResponse.json({
      success: true,
      message: 'Analysis deleted successfully',
    });

  } catch (error) {
    console.error('Delete analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete analysis',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/crop-ai/[analysisId]
// Update user notes for an analysis
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    await dbConnect();

    const { analysisId } = await params;

    // Validate analysisId format
    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid analysis ID format' },
        { status: 400 }
      );
    }

    // Authenticate user
    const authPhone = request.headers.get('x-user-phone');
    if (!authPhone) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cleanPhone = authPhone.replace(/\D/g, '');
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userNotes } = body;

    if (typeof userNotes !== 'string') {
      return NextResponse.json(
        { success: false, error: 'userNotes must be a string' },
        { status: 400 }
      );
    }

    // Validate notes length
    if (userNotes.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'User notes cannot exceed 1000 characters' },
        { status: 400 }
      );
    }

    // Find analysis by ID
    const analysis = await CropAnalysis.findById(analysisId);

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (analysis.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { success: false, error: 'Access denied. This analysis belongs to another user.' },
        { status: 403 }
      );
    }

    // Update user notes
    analysis.userNotes = userNotes.trim();
    await analysis.save();

    return NextResponse.json({
      success: true,
      message: 'Notes updated successfully',
      data: {
        userNotes: analysis.userNotes,
      },
    });

  } catch (error) {
    console.error('Update analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update analysis',
      },
      { status: 500 }
    );
  }
}
