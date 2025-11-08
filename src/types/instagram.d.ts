export interface ApifyComment {
    type: string;
    id: string;
    userId: string;
    message: string;
    createdAt: string;
    likeCount: number;
    replyCount: number;
    user: {
        id: string;
        username: string;
        fullName: string;
        isVerified: boolean;
        isPrivate: boolean;
        profilePicUrl: string;
    };
    isRanked: boolean;
}
export interface AnalysisResult {
    sentiment: "positive" | "negative" | "neutral";
    summary: string;
    keywords: string[];
    category: string;
    confidence_score: number;
}
export interface InstagramComment {
    id: string;
    source: string;
    content: string;
    created_at: string;
    analysis?: AnalysisResult;
    analyzed_at?: string;
}
//# sourceMappingURL=instagram.d.ts.map