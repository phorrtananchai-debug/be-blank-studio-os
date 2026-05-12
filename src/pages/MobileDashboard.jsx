import { useEffect, useState } from 'react';
import { MobileHome } from '../components/mobile/MobileHome.jsx';
import { MobileMore } from '../components/mobile/MobileMore.jsx';
import { MobileProfileSheet } from '../components/mobile/MobileProfileSheet.jsx';
import { MobileQuickAdd, MobileTaskSheet } from '../components/mobile/MobileTaskSheet.jsx';
import { ProfileAvatar } from './mobileComponents.jsx';
import { DEMO_MODE } from './mobileConfig.js';
import { demoFocusDate, demoNotes, demoProjects, demoTasks } from './mobileDemoData.js';
import { useMobileNotes } from './mobile/hooks/useMobileNotes.js';
import { useMobileProjects } from './mobile/hooks/useMobileProjects.js';
import { useMobileTasks } from './mobile/hooks/useMobileTasks.js';
import { getProfileImage, removeProfileImage, setProfileImage } from './mobileUtils.js';
import { MobileCalendar } from './MobileCalendar.jsx';
import { MobileProjects } from './MobileProjects.jsx';

const tabs = ['Home', 'Calendar', '+', 'Projects', 'More'];

export function MobileDashboard({ onSignOut, user }) {
  const [activeTab, setActiveTab] = useState('Home');
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileImage, setProfileImageState] = useState(() => getProfileImage());
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const handleOpenQuickAdd = () => setIsQuickAddOpen(true);
    window.addEventListener('mobile-open-quick-add', handleOpenQuickAdd);
    return () => window.removeEventListener('mobile-open-quick-add', handleOpenQuickAdd);
  }, []);

  const projects = useMobileProjects(user);
  const notes = useMobileNotes();
  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 3200);
  };
  const {
    clearCompletedTasks,
    createTask,
    deleteTask,
    duplicateTask,
    editTask,
    markTaskDone,
    moveTask,
    tasks,
  } = useMobileTasks({ onSelectTask: setSelectedTask, onToast: showToast });

  const openQuickAdd = () => setIsQuickAddOpen(true);
  const updateProfileImage = (dataUrl) => {
    setProfileImage(dataUrl);
    setProfileImageState(dataUrl);
  };
  const clearProfileImage = () => {
    removeProfileImage();
    setProfileImageState('');
  };
  const openProject = (project) => {
    setSelectedProjectId(project.id);
    setActiveTab('Projects');
  };
  const useDemoData = DEMO_MODE || !projects.length || !tasks.length;
  const displayProjects = useDemoData ? demoProjects : projects;
  const displayTasks = useDemoData ? demoTasks : tasks;
  const displayNotes = useDemoData ? demoNotes : notes;
  const initialMobileDate = useDemoData ? demoFocusDate : undefined;
  const content = {
    Home: (
      <MobileHome
        initialDate={initialMobileDate}
        projects={displayProjects}
        tasks={displayTasks}
        onDeleteTask={deleteTask}
        onDoneTask={markTaskDone}
        onDuplicateTask={duplicateTask}
        onEditTask={editTask}
        onMoveTask={moveTask}
        onOpenProject={openProject}
        onOpenTask={setSelectedTask}
      />
    ),
    Calendar: <MobileCalendar initialDate={initialMobileDate} projects={displayProjects} tasks={displayTasks} onDeleteTask={deleteTask} onDoneTask={markTaskDone} onDuplicateTask={duplicateTask} onEditTask={editTask} onMoveTask={moveTask} onOpenTask={setSelectedTask} />,
    Projects: (
      <MobileProjects
        notes={displayNotes}
        projects={displayProjects}
        selectedProjectId={selectedProjectId}
        tasks={displayTasks}
        onSelectProject={setSelectedProjectId}
      />
    ),
    More: <MobileMore profileImage={profileImage} tasks={displayTasks} user={user} onClearCompleted={clearCompletedTasks} onOpenProfile={() => setIsProfileOpen(true)} onSignOut={onSignOut} />,
  }[activeTab];

  return (
    <main className="relative mx-auto flex h-[100dvh] min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-[#F5F5FA] text-[#212121]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 w-full shrink-0 items-center justify-between bg-transparent px-4">
          <button className="grid size-10 place-items-center rounded-full bg-white transition duration-[120ms] ease-out active:scale-95" type="button">
            <img
              src="/logo-bb-black.png"
              alt="BB Studio"
              className="h-auto w-7 object-contain"
            />
          </button>
          <h1 className="text-sm font-medium tracking-tight text-[#212121]">Studio OS</h1>
          <ProfileAvatar profileImage={profileImage} user={user} onClick={() => setIsProfileOpen(true)} />
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 pt-5">
          {toastMessage && (
            <div className="mb-5 rounded-[16px] border border-[rgba(33,33,33,0.08)] px-4 py-3 text-sm text-[#212121]">
              {toastMessage}
            </div>
          )}
          {content}
        </section>
      </div>

      <nav className="absolute bottom-5 left-4 right-4 z-50 grid h-[64px] grid-cols-5 items-center rounded-full bg-[#212121] px-3 text-[11px] font-semibold text-white/55">
        {tabs.map((tab) => (
          <button
            key={tab}
            aria-current={activeTab === tab ? 'page' : undefined}
            aria-label={tab === '+' ? 'Quick add' : tab}
            className={`flex min-h-11 items-center justify-center rounded-[18px] transition duration-[120ms] ease-out active:scale-95 ${
              tab === '+' ? 'mx-auto size-12 rounded-full bg-white text-xl text-[#212121]' : activeTab === tab ? 'scale-105 text-[#FFF0A3]' : 'text-white/55'
            }`}
            type="button"
            onClick={() => {
              if (tab === '+') {
                openQuickAdd();
                return;
              }

              if (tab !== 'Projects') {
                setSelectedProjectId('');
              }
              setActiveTab(tab);
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      {selectedTask && <MobileTaskSheet projects={displayProjects} task={selectedTask} onClose={() => setSelectedTask(null)} onDone={markTaskDone} />}
      {isQuickAddOpen && <MobileQuickAdd projects={displayProjects} onClose={() => setIsQuickAddOpen(false)} onCreate={createTask} />}
      {isProfileOpen && (
        <MobileProfileSheet
          profileImage={profileImage}
          user={user}
          onChangeImage={updateProfileImage}
          onClose={() => setIsProfileOpen(false)}
          onRemoveImage={clearProfileImage}
        />
      )}
    </main>
  );
}
