
import { supabase } from './auth';
import { Quiz, QuizResult, QuizStats } from '../types';

export const MASTER_ADMIN_EMAIL = 'guic.campos@gmail.com';

export const getQuizzes = async (): Promise<Quiz[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const isMasterAdmin = user.email === MASTER_ADMIN_EMAIL;

    let query = supabase
        .from('quizzes')
        .select('*');

    // If not master admin, only show own quizzes
    if (!isMasterAdmin) {
        query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching quizzes:', error);
        return [];
    }

    // Map database snake_case to typescript camelCase
    return data.map(q => ({
        id: q.id,
        userId: q.user_id,
        title: q.title,
        slug: q.slug,
        description: q.description || '',
        questions: q.questions,
        theme: q.theme,
        tracking: q.tracking,
        redirectUrl: q.redirect_url,
        webhookUrl: q.webhook_url,
        showScore: q.show_score,
        outcomes: q.outcomes,
        active: q.active,
        autoRedirectDelay: q.auto_redirect_delay,
        sections: q.sections || [],
        leadCapture: q.lead_capture,
        scoringSystem: q.scoring_system || 'CORRECT_WRONG',
        hideDefaultButton: q.hide_default_button || false,
        createdAt: q.created_at
    }));
};

export const getQuizBySlug = async (slug: string): Promise<Quiz | null> => {
    const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('Error fetching quiz by slug:', error);
        return null;
    }

    return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        slug: data.slug,
        description: data.description || '',
        questions: data.questions,
        theme: data.theme,
        tracking: data.tracking,
        redirectUrl: data.redirect_url,
        webhookUrl: data.webhook_url,
        showScore: data.show_score,
        outcomes: data.outcomes,
        active: data.active,
        autoRedirectDelay: data.auto_redirect_delay,
        sections: data.sections || [],
        leadCapture: data.lead_capture,
        scoringSystem: data.scoring_system || 'CORRECT_WRONG',
        hideDefaultButton: data.hide_default_button || false,
        createdAt: data.created_at
    };
};

export const saveQuiz = async (quiz: Quiz): Promise<{ error: any }> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return { error: 'Not authenticated' };

    const dbQuiz = {
        id: quiz.id,
        user_id: quiz.userId || user.id,
        title: quiz.title,
        slug: quiz.slug,
        description: quiz.description,
        questions: quiz.questions,
        theme: quiz.theme,
        tracking: quiz.tracking,
        redirect_url: quiz.redirectUrl,
        webhook_url: quiz.webhookUrl,
        show_score: quiz.showScore,
        scoring_system: quiz.scoringSystem,
        outcomes: quiz.outcomes,
        active: quiz.active,
        auto_redirect_delay: quiz.autoRedirectDelay,
        lead_capture: quiz.leadCapture,
        sections: quiz.sections || [],
        hide_default_button: quiz.hideDefaultButton || false
    };

    const { error } = await supabase
        .from('quizzes')
        .upsert(dbQuiz);

    return { error };
};

export const deleteQuiz = async (id: string): Promise<{ error: any }> => {
    const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id);

    return { error };
};

export const saveResult = async (result: QuizResult): Promise<{ error: any }> => {
    // 1. Get Quiz info to check for webhook
    const { data: quizData } = await supabase
        .from('quizzes')
        .select('webhook_url, title')
        .eq('id', result.quizId)
        .single();

    // 2. Save lead to DB
    const { data: leadData, error } = await supabase
        .from('leads')
        .insert({
            quiz_id: result.quizId,
            answers: result.answers,
            score: result.score,
            total_correct: result.totalCorrect,
            total_questions: result.totalQuestions,
            duration_seconds: result.durationSeconds,
            completed_at: result.completedAt
        })
        .select()
        .single();

    // 3. Trigger Webhook if exists
    if (quizData?.webhook_url) {
        try {
            fetch(quizData.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'quiz_completed',
                    quiz_title: quizData.title,
                    lead: {
                        ...result,
                        id: leadData?.id
                    },
                    context: result.context
                })
            }).catch(e => console.error('Webhook failed:', e));
        } catch (e) {
            console.error('Webhook error:', e);
        }
    }

    return { data: leadData, error };
};

export const updateLead = async (leadId: string, data: any) => {
    const { error } = await supabase
        .from('leads')
        .update({
            answers: data.answers,
            score: data.score
        })
        .eq('id', leadId);
    return { error };
};

export const getLeads = async (quizId: string) => {
    const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false });

    if (error) {
        console.error('Error fetching leads:', error);
        return [];
    }

    return data;
};

export const resetQuizStats = async (quizId: string) => {
    // 1. Delete all leads for this quiz
    const { error: leadsError } = await supabase
        .from('leads')
        .delete()
        .eq('quiz_id', quizId);

    // 2. Delete all events for this quiz
    const { error: eventsError } = await supabase
        .from('quiz_events')
        .delete()
        .eq('quiz_id', quizId);

    if (leadsError || eventsError) {
        console.error('Error resetting stats:', leadsError || eventsError);
        return { error: leadsError || eventsError };
    }

    return { success: true };
};

export const getStats = async (quizId: string, startDate?: Date, endDate?: Date): Promise<QuizStats> => {
    // 1. Get Total Views
    let viewsQuery = supabase
        .from('quiz_events')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId)
        .eq('event_type', 'view');

    if (startDate) viewsQuery = viewsQuery.gte('created_at', startDate.toISOString());
    if (endDate) viewsQuery = viewsQuery.lte('created_at', endDate.toISOString());

    const { count: totalViews } = await viewsQuery;

    // 2. Get Total Conversions (Redirects reached)
    let conversionQuery = supabase
        .from('quiz_events')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId)
        .eq('event_type', 'conversion');

    if (startDate) conversionQuery = conversionQuery.gte('created_at', startDate.toISOString());
    if (endDate) conversionQuery = conversionQuery.lte('created_at', endDate.toISOString());

    const { count: totalConversions } = await conversionQuery;

    // 3. Get Total Leads (Form submissions)
    let leadsQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', quizId);

    if (startDate) leadsQuery = leadsQuery.gte('completed_at', startDate.toISOString());
    if (endDate) leadsQuery = endDate ? leadsQuery.lte('completed_at', endDate.toISOString()) : leadsQuery;

    const { count: totalLeads } = await leadsQuery;

    // 4. Get Average Stay Duration from all visits
    let durationQuery = supabase
        .from('quiz_events')
        .select('duration_seconds')
        .eq('quiz_id', quizId)
        .eq('event_type', 'view');

    if (startDate) durationQuery = durationQuery.gte('created_at', startDate.toISOString());
    if (endDate) durationQuery = durationQuery.lte('created_at', endDate.toISOString());

    const { data: durationData } = await durationQuery;
    const totalDuration = durationData?.reduce((acc, l) => acc + (l.duration_seconds || 0), 0) || 0;
    const avgTimeSeconds = totalViews && totalViews > 0 ? Math.round(totalDuration / totalViews) : 0;

    // 4. Get Funnel Data
    let funnelQuery = supabase
        .from('quiz_events')
        .select('event_type, question_id')
        .eq('quiz_id', quizId)
        .in('event_type', ['step_view', 'step_answer']);

    if (startDate) funnelQuery = funnelQuery.gte('created_at', startDate.toISOString());
    if (endDate) funnelQuery = funnelQuery.lte('created_at', endDate.toISOString());

    const { data: events } = await funnelQuery;

    // 5. Group events by question_id
    const funnelMap: Record<string, { views: number; completed: number }> = {};
    events?.forEach(e => {
        if (!e.question_id) return;
        if (!funnelMap[e.question_id]) funnelMap[e.question_id] = { views: 0, completed: 0 };

        if (e.event_type === 'step_view') funnelMap[e.question_id].views++;
        if (e.event_type === 'step_answer') funnelMap[e.question_id].completed++;
    });

    const funnel = Object.entries(funnelMap).map(([questionId, data]) => ({
        questionId,
        views: data.views,
        completed: data.completed,
        dropOffs: Math.max(0, data.views - data.completed)
    }));

    const views = totalViews || 0;
    const conversions = totalConversions || 0;
    const leads = totalLeads || 0;
    const conversionRate = views > 0 ? Math.round((conversions / views) * 100) : 0;

    return {
        views,
        completions: leads, // Keep "Leads" displayed in the card as leads
        avgTimeSeconds,
        conversionRate,
        funnel
    };
};

export const trackQuizView = async (quizId: string, sessionId: string) => {
    await supabase.from('quiz_events').insert({
        id: sessionId,
        quiz_id: quizId,
        event_type: 'view',
        duration_seconds: 0
    });
};

export const trackQuizDuration = async (quizId: string, sessionId: string, duration: number) => {
    await supabase.from('quiz_events').upsert({
        id: sessionId,
        quiz_id: quizId,
        event_type: 'view',
        duration_seconds: duration
    });
};

export const trackConversion = async (quizId: string) => {
    await supabase.from('quiz_events').insert({
        quiz_id: quizId,
        event_type: 'conversion'
    });
};

export const trackQuestionView = async (quizId: string, questionId: string) => {
    await supabase.from('quiz_events').insert({
        quiz_id: quizId,
        event_type: 'step_view',
        question_id: questionId
    });
};

export const trackQuestionAnswer = async (quizId: string, questionId: string) => {
    await supabase.from('quiz_events').insert({
        quiz_id: quizId,
        event_type: 'step_answer',
        question_id: questionId
    });
};
