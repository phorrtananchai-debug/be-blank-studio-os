import { useEffect, useState } from 'react';
import { MobileHome } from '../components/mobile/MobileHome.jsx';
import { MobileMore } from '../components/mobile/MobileMore.jsx';
import { MobileProfileSheet } from '../components/mobile/MobileProfileSheet.jsx';
import { MobileQuickAdd, MobileTaskSheet } from '../components/mobile/MobileTaskSheet.jsx';
import { StatusToast } from '../components/StatusToast.jsx';
import { useToastMessage } from '../hooks/useToastMessage.js';
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
  const { showToast, toast } = useToastMessage();

  useEffect(() => {
    const handleOpenQuickAdd = () => setIsQuickAddOpen(true);
    window.addEventListener('mobile-open-quick-add', handleOpenQuickAdd);
    return () => window.removeEventListener('mobile-open-quick-add', handleOpenQuickAdd);
  }, []);

  const projects = useMobileProjects(user);
  const notes = useMobileNotes();
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
  const createMobileTask = async (task, addToCalendar = false) => {
    if (useDemoData) {
      showToast('Preview data is read-only. Connect Firebase to create mobile tasks.', 'info');
      return false;
    }

    return createTask(task, addToCalendar);
  };
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
        onQuickAdd={openQuickAdd}
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
          <h1 className="type-mobile-title text-sm font-medium">Studio OS</h1>
          <ProfileAvatar profileImage={profileImage} user={user} onClick={() => setIsProfileOpen(true)} />
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 pt-5">
          {toast?.message && <StatusToast className="mb-5" message={toast.message} tone={toast.tone} />}
          {useDemoData && (
            <div className="type-mobile-body mb-5 rounded-[18px] border border-[rgba(33,33,33,0.08)] bg-white/70 px-4 py-3 text-xs leading-5">
              <span className="font-semibold text-[#212121]">Preview workspace.</span> Demo projects and tasks are read-only until live mobile data is synced.
            </div>
          )}
          {content}
        </section>
      </div>

      <nav className="type-mobile-nav absolute bottom-5 left-4 right-4 z-50 grid h-[64px] grid-cols-5 items-center rounded-full bg-[#212121] px-3 text-white/55">
        {tabs.map((tab) => (
          <button
            key={tab}
            aria-current={activeTab === tab ? 'page' : undefined}
            aria-label={tab === '+' ? 'Quick add' : tab}
            title={tab === '+' ? 'Quick add' : tab}
            className={`flex min-h-11 items-center justify-center rounded-[18px] transition duration-[120ms] ease-out active:scale-95 ${
              tab === '+' ? 'mx-auto size-12 rounded-full bg-white text-xl text-[#212121] shadow-[0_8px_22px_rgba(255,255,255,0.12)]' : activeTab === tab ? 'scale-105 text-[#FFF0A3]' : 'text-white/55'
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

      {selectedTask && (
        <MobileTaskSheet
          projects={displayProjects}
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={deleteTask}
          onDone={markTaskDone}
          onDuplicate={duplicateTask}
          onEdit={editTask}
          onMove={moveTask}
        />
      )}
      {isQuickAddOpen && <MobileQuickAdd projects={displayProjects} onClose={() => setIsQuickAddOpen(false)} onCreate={createMobileTask} />}
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
