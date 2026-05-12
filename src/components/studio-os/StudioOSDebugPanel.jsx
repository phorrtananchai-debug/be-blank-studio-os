export function StudioOSDebugPanel({ debugInfo }) {
  return (
    <section className="rounded-2xl border border-black/[0.02] bg-[#f9f9f7] p-8 text-[10px] font-bold uppercase  text-studio-muted/50">
      <p className="mb-6 text-studio-orange">System Debug Trace</p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <span>apiKeyExists: {String(debugInfo.apiKeyExists)}</span>
        <span>configSource: {debugInfo.configSource}</span>
        <span>apiKeySuffix: {debugInfo.apiKeySuffix || 'missing'}</span>
        <span>projectId: {debugInfo.projectId || 'missing'}</span>
        <span>authDomain: {debugInfo.authDomain || 'missing'}</span>
        <span>appIdExists: {String(debugInfo.appIdExists)}</span>
        <span>storageBucket: {debugInfo.storageBucket || 'missing'}</span>
      </div>
    </section>
  );
}
