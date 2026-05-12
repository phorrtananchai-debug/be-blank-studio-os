import { useRef } from 'react';
import { compressProfileImage } from '../../pages/mobileUtils.js';

function getProfileDisplayImage(profileImage, user) {
  return profileImage || user?.photoURL || '';
}

export function MobileProfileSheet({ onChangeImage, onClose, onRemoveImage, profileImage, user }) {
  const inputRef = useRef(null);
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Por';
  const image = getProfileDisplayImage(profileImage, user);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    compressProfileImage(file, 800).then(onChangeImage).catch(() => {});
    event.target.value = '';
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-end bg-black/20">
      <button aria-label="Close profile sheet" className="absolute inset-0 cursor-default" type="button" onClick={onClose} />
      <div className="relative z-10 w-full rounded-t-[32px] bg-white p-5 shadow-[0_-12px_32px_rgba(0,0,0,0.12)]">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[rgba(33,33,33,0.12)]" />
        <div className="flex items-center gap-4">
          {image ? (
            <img alt="Profile preview" className="h-20 w-20 rounded-full object-cover" src={image} />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-[#DBDFE9] text-2xl font-semibold text-[#212121]">P</span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-2xl font-semibold text-[#212121]">{displayName}</h3>
            <p className="mt-1 truncate text-sm text-[#777777]">{user?.email || 'Private workspace'}</p>
          </div>
        </div>

        <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={handleFileChange} />

        <div className="mt-6 grid gap-3">
          <button className="min-h-12 rounded-[18px] bg-[#212121] px-4 text-sm font-semibold text-white transition-all duration-150 active:scale-[0.98]" type="button" onClick={() => inputRef.current?.click()}>
            Change picture
          </button>
          <button className="min-h-12 rounded-[18px] bg-[#F5F5FA] px-4 text-sm font-semibold text-[#212121] transition-all duration-150 active:scale-[0.98]" type="button" onClick={onRemoveImage}>
            Remove picture
          </button>
          <button className="min-h-12 rounded-[18px] border border-[rgba(33,33,33,0.08)] px-4 text-sm font-semibold text-[#777777] transition-all duration-150 active:scale-[0.98]" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
