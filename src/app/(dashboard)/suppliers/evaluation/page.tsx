'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy, TrendingDown, Star, Package, CheckCircle, DollarSign, Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// ===========================================================================
// Helpers
// ===========================================================================

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreBadgeClass(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

function rankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Trophy className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Trophy className="h-5 w-5 text-amber-600" />;
  return <span className="text-muted-foreground font-mono">#{rank}</span>;
}

// ===========================================================================
// Types
// ===========================================================================

interface RankedSupplier {
  rank: number;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  category: string | null;
  latestScore: {
    overallScore: number;
    deliveryScore: number;
    qualityScore: number;
    priceScore: number;
    responseScore: number;
  };
}

// ===========================================================================
// Component
// ===========================================================================

export default function SupplierEvaluationPage() {
  const router = useRouter();
  const [rankings, setRankings] = useState<RankedSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('overallScore');

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/ranking?sortBy=${sortBy}&limit=50`);
      const json = await res.json();
      if (json.success) {
        setRankings(json.data.rankings || []);
      }
    } catch {
      toast.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const avgScore = rankings.length > 0
    ? rankings.reduce((sum, s) => sum + (s.latestScore?.overallScore || 0), 0) / rankings.length
    : 0;
  const topPerformers = rankings.filter((s) => (s.latestScore?.overallScore || 0) >= 80).length;
  const needsImprovement = rankings.filter((s) => (s.latestScore?.overallScore || 0) < 60).length;

  return (
    <div className="space-y-6 container mx-auto max-w-6xl py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Đánh giá nhà cung cấp</h1>
        <p className="text-muted-foreground">Bảng xếp hạng theo KPIs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tổng NCC có điểm</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rankings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Điểm trung bình</CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${scoreColor(avgScore)}`}>
              {avgScore.toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Star className="h-4 w-4 text-green-500" />
              Top Performers (&ge;80)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{topPerformers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Cần cải thiện (&lt;60)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{needsImprovement}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sort */}
      <div className="flex gap-4">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Sắp xếp theo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overallScore">Điểm tổng</SelectItem>
            <SelectItem value="deliveryScore">Giao hàng</SelectItem>
            <SelectItem value="qualityScore">Chất lượng</SelectItem>
            <SelectItem value="priceScore">Giá</SelectItem>
            <SelectItem value="responseScore">Phản hồi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ranking Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Hạng</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Package className="h-3.5 w-3.5" /> Giao hàng
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Chất lượng
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Giá
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Phản hồi
                  </span>
                </TableHead>
                <TableHead className="text-center">Tổng điểm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                  </TableCell>
                </TableRow>
              ) : rankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chưa có dữ liệu đánh giá. Hãy tính điểm cho nhà cung cấp trước.
                  </TableCell>
                </TableRow>
              ) : (
                rankings.map((s) => {
                  const sc = s.latestScore;
                  return (
                    <TableRow
                      key={s.supplierId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/suppliers/${s.supplierId}/scorecard`)}
                    >
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {rankIcon(s.rank)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.supplierName}</p>
                          <p className="text-xs text-muted-foreground">{s.supplierCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className={`text-center font-mono ${scoreColor(sc.deliveryScore)}`}>
                        {sc.deliveryScore.toFixed(1)}
                      </TableCell>
                      <TableCell className={`text-center font-mono ${scoreColor(sc.qualityScore)}`}>
                        {sc.qualityScore.toFixed(1)}
                      </TableCell>
                      <TableCell className={`text-center font-mono ${scoreColor(sc.priceScore)}`}>
                        {sc.priceScore.toFixed(1)}
                      </TableCell>
                      <TableCell className={`text-center font-mono ${scoreColor(sc.responseScore)}`}>
                        {sc.responseScore.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={scoreBadgeClass(sc.overallScore)}>
                          {sc.overallScore.toFixed(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
