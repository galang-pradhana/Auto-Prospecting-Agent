export function prepareForgeUpdateData(lead: any, htmlCode: string, slug: string) {
  const isReforge = lead.status === 'LIVE';

  return {
    htmlCode,
    status: 'LIVE' as const,
    slug,
    // Preserve data jika sudah LIVE (re-forge), reset jika baru pertama kali
    nextFollowupAt: isReforge ? lead.nextFollowupAt : null,
    lastContactAt: isReforge ? lead.lastContactAt : new Date(),
    followupStage: isReforge ? lead.followupStage : 'sent',
    followupCount: isReforge ? lead.followupCount : 0,
  };
}
