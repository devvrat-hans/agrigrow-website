import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import CropAnalysis, { CropHealthStatus, AnalysisStatus } from '@/models/CropAnalysis';

// Valid health status values
const VALID_HEALTH_STATUSES: CropHealthStatus[] = ['healthy', 'moderate', 'critical'];

// Valid analysis status values
const VALID_STATUSES: AnalysisStatus[] = ['processing', 'completed', 'failed'];

// GET /api/crop-ai/history
// Get paginated analysis history for the authenticated user
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const cropType = searchParams.get('cropType');
    const healthStatus = searchParams.get('healthStatus');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    const query: Record<string, unknown> = {
      userId: user._id,
    };

    // Filter by crop type
    if (cropType && cropType.trim()) {
      query.cropType = { $regex: new RegExp(cropType.trim(), 'i') };
    }

    // Filter by health status
    if (healthStatus && VALID_HEALTH_STATUSES.includes(healthStatus as CropHealthStatus)) {
      query.overallHealth = healthStatus;
    }

    // Filter by analysis status
    if (status && VALID_STATUSES.includes(status as AnalysisStatus)) {
      query.status = status;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      const dateQuery: Record<string, Date> = {};
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          dateQuery.$gte = fromDate;
        }
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          // Set to end of day
          toDate.setHours(23, 59, 59, 999);
          dateQuery.$lte = toDate;
        }
      }
      
      if (Object.keys(dateQuery).length > 0) {
        query.analysisDate = dateQuery;
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute count and find queries in parallel
    const [totalCount, analyses] = await Promise.all([
      CropAnalysis.countDocuments(query),
      CropAnalysis.find(query)
        .select({
          _id: 1,
          imageUrl: 1,
          imageThumbnail: 1,
          cropType: 1,
          overallHealth: 1,
          healthScore: 1,
          analysisDate: 1,
          status: 1,
          diseases: 1,
          nutrientDeficiencies: 1,
          pests: 1,
        })
        .sort({ analysisDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    // Format response data
    const formattedAnalyses = analyses.map(analysis => ({
      id: analysis._id.toString(),
      imageUrl: analysis.imageUrl,
      imageThumbnail: analysis.imageThumbnail || analysis.imageUrl,
      cropType: analysis.cropType,
      overallHealth: analysis.overallHealth,
      healthScore: analysis.healthScore,
      analysisDate: analysis.analysisDate.toISOString(),
      status: analysis.status,
      diseaseCount: analysis.diseases?.length || 0,
      deficiencyCount: analysis.nutrientDeficiencies?.length || 0,
      pestCount: analysis.pests?.length || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        analyses: formattedAnalyses,
        pagination: {
          page,
          limit,
          totalPages,
          totalCount,
          hasMore,
        },
      },
    });

  } catch (error) {
    console.error('Get analysis history error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analysis history',
      },
      { status: 500 }
    );
  }
}
