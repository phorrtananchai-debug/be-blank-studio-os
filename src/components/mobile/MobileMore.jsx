import { useState } from 'react';
import { isFirebaseConfigured } from '../../services/firebase.js';
import { isTaskDone } from '../../pages/mobile/mobileTaskUtils.js';

function getProfileDisplayImage(profileImage, user) {
  return profileImage || user?.photoURL || '';
}

function ProfileCard({ onOpenProfile, profileImage, user }) {
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Por';
  const image = getProfileDisplayImage(profileImage, user);

  return (
    <section className="rounded-[28px] bg-[#212121] p-5 text-white">
      <div className="flex items-center gap-4">
        {image ? (
          <img alt="Profile" className="h-16 w-16 rounded-full object-cover" src={image} />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-lg font-semibold uppercase text-white">
            {displayName[0] || 'P'}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-semibold text-white">{displayName}</p>
          <p className="mt-1 truncate text-sm text-white/60">{user?.email || 'Private workspace'}</p>
          <button className="mt-3 min-h-11 rounded-full bg-white/10 px-4 text-[11px] font-semibold uppercase tracking-tight text-white transition-all duration-150 active:scale-[0.98]" type="button" onClick={onOpenProfile}>
            Change picture
          </button>
        </div>
      </div>
    </section>
  );
}

function MoreSection({ children, title }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-medium uppercase tracking-tight text-[#777777]">{title}</h2>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function MoreRow({ danger = false, label, meta, onClick }) {
  return (
    <button
      className={`flex min-h-[56px] w-full cursor-pointer items-center justify-between gap-4 rounded-[22px] border border-[rgba(33,33,33,0.08)] px-4 py-3 text-left transition duration-[120ms] ease-out active:scale-95 active:bg-[#DBDFE9] ${danger ? 'bg-white/70' : 'bg-white'}`}
      type="button"
      onClick={onClick}
    >
      <span className={`text-[17px] font-medium ${danger ? 'text-[#777777]' : 'text-[#212121]'}`}>{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        {meta && <span className={`min-w-0 truncate text-right text-sm ${danger ? 'text-[#212121]' : 'text-[#777777]'}`}>{meta}</span>}
        <span className={danger ? 'text-[#212121]' : 'text-[#777777]'}>{'>'}</span>
      </span>
    </button>
  );
}

function SyncMeta({ status }) {
  const color = status === 'Synced' ? '#CFDECA' : status === 'Pending' ? '#FFF0A3' : '#DBDFE9';

  return (
    <span className="flex items-center gap-2 text-sm text-[#777777]">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

export function MobileMore({ onClearCompleted, onOpenProfile, onSignOut, profileImage, tasks, user }) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [toolMessage, setToolMessage] = useState('');
  const completedCount = tasks.filter(isTaskDone).length;
  const syncStatus = isFirebaseConfigured() ? 'Synced' : 'Offline';
  const dataStatus = `${tasks.length} tasks`;
  const lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const showToolMessage = (message) => {
    setToolMessage(message);
    window.setTimeout(() => setToolMessage(''), 2600);
  };

  return (
    <div className="page-fade space-y-6 pb-28">
      <ProfileCard profileImage={profileImage} user={user} onOpenProfile={onOpenProfile} />

      {toolMessage && (
        <div className="rounded-[20px] border border-[rgba(33,33,33,0.08)] bg-white px-4 py-3 text-sm text-[#212121]">
          {toolMessage}
        </div>
      )}

      <MoreSection title="Account">
        <MoreRow label="Profile" meta="Placeholder" onClick={() => showToolMessage('Profile settings coming soon.')} />
        <MoreRow label="Account email" meta={user?.email || 'Private workspace'} onClick={() => showToolMessage(user?.email || 'Private workspace')} />
      </MoreSection>

      <MoreSection title="System">
        <MoreRow label="Sync status" meta={<SyncMeta status={syncStatus} />} onClick={() => showToolMessage(`Sync status: ${syncStatus}`)} />
        <MoreRow label="Data source" meta="Firestore realtime" onClick={() => showToolMessage('Firestore realtime sync is active.')} />
        <MoreRow label="Last updated" meta={lastUpdated} onClick={() => showToolMessage(`Last updated ${lastUpdated}`)} />
        <MoreRow label="Data status" meta={dataStatus} onClick={() => showToolMessage(dataStatus)} />
      </MoreSection>

      <MoreSection title="Tools">
        <MoreRow label="Clear completed tasks" meta={`${completedCount} done`} onClick={() => setConfirmClear(true)} />
        <MoreRow label="Export data" meta="Soon" onClick={() => showToolMessage('Export coming soon.')} />
        <MoreRow label="Rebuild calendar index" meta="Refresh" onClick={() => showToolMessage('Calendar index refreshed.')} />
      </MoreSection>

      <MoreSection title="About">
        <MoreRow label="Studio OS" meta="Be Blank" onClick={() => showToolMessage('Studio OS')} />
        <MoreRow label="Version" meta="v0.1" onClick={() => showToolMessage('Version v0.1')} />
        <MoreRow label="Be blank to behind studio" meta="Studio" onClick={() => showToolMessage('Be blank to behind studio')} />
      </MoreSection>

      <MoreSection title="Danger">
        <MoreRow danger label="Sign out" meta="Exit" onClick={onSignOut} />
      </MoreSection>

      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-end bg-[rgba(33,33,33,0.25)]">
          <div className="w-full rounded-t-[32px] bg-white p-5">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[rgba(33,33,33,0.08)]" />
            <h3 className="text-xl font-semibold text-[#212121]">Clear completed tasks?</h3>
            <p className="mt-2 text-sm leading-6 text-[#777777]">
              This will remove {completedCount} completed {completedCount === 1 ? 'task' : 'tasks'} from the mobile workspace.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] text-sm font-medium text-[#212121] transition duration-[120ms] ease-out active:scale-95" type="button" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button
                className="h-12 rounded-[18px] bg-[#FFF0A3] text-sm font-semibold text-[#212121] transition duration-[120ms] ease-out active:scale-95"
                type="button"
                onClick={async () => {
                  try {
                    await onClearCompleted();
                    setConfirmClear(false);
                    showToolMessage('Completed tasks cleared.');
                  } catch {
                    showToolMessage('Could not clear completed tasks.');
                  }
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
