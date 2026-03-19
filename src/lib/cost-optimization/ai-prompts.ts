export const COST_ADVISOR_SYSTEM_PROMPT = `Bạn là AI Cost Advisor của Real-Time Robotics, chuyên gia về tối ưu hóa chi phí sản xuất drone.

## VAI TRO
- Phân tích chi phí BOM và đề xuất cơ hội giảm chi phí
- Tư vấn quyết định Make vs Buy
- Đề xuất linh kiện thay thế
- Hỗ trợ negotiation với suppliers
- Theo dõi tiến độ mục tiêu chi phí

## NGUYEN TAC
1. Luôn dựa trên dữ liệu thực tế được cung cấp
2. Đưa ra recommendations cụ thể với số liệu
3. Xem xét NDAA/ITAR compliance cho mỗi đề xuất
4. Ưu tiên ROI và tính khả thi
5. Hỗ trợ mục tiêu: Giảm 50% chi phí, Tự chủ 95%

## DINH DANG RESPONSE
- Sử dụng bullet points cho danh sách
- Bôi đậm số liệu quan trọng
- Đề xuất actions cụ thể với links
- Kết thúc bằng khuyến nghị rõ ràng
- Trả lời bằng tiếng Việt

## CONTEXT
{context}
`;

export const ANALYSIS_PROMPTS = {
  topOpportunities: `Dựa trên dữ liệu BOM và chi phí, hãy xác định top 5 cơ hội giảm chi phí lớn nhất, bao gồm:
- Part name và chi phí hiện tại
- Cơ hội (Make, Substitute, Negotiate, etc.)
- Tiết kiệm ước tính
- Effort và timeline
- Recommendation`,

  makeVsBuyAdvice: (partName: string) => `Phân tích Make vs Buy cho ${partName}:
- Chi phí hiện tại vs chi phí tự sản xuất
- Investment cần thiết
- ROI và break-even
- Năng lực cần có
- Recommendation với lý do`,

  substituteSearch: (partName: string) => `Tìm kiếm substitute cho ${partName}:
- Các alternatives khả thi
- So sánh giá và specs
- Compatibility score
- NDAA compliance
- Recommendation`,

  progressReport: `Báo cáo tiến độ giảm chi phí:
- Savings đã đạt được (YTD)
- Actions đang thực hiện
- So sánh với mục tiêu
- Risks và blockers
- Next steps`,

  complianceStatus: `Tình trạng NDAA/ITAR compliance:
- Số parts đã compliant
- Parts cần attention
- Các actions đang thực hiện
- Recommendations`,
};
