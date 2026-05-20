import { ArrowLeft } from 'lucide-react';
import { ArtworkSpace } from '../artwork/ArtworkSpace.jsx';
import { BoardGallery } from '../artwork/BoardGallery.jsx';
import { ContentPlanner } from '../dashboard/ContentPlanner.jsx';
import { PortfolioManager } from '../dashboard/PortfolioManager.jsx';
import { ProjectDashboard } from '../dashboard/ProjectDashboard.jsx';
import { TimelineCalculator } from '../dashboard/TimelineCalculator.jsx';
import { EditorialLayoutDashboard } from './EditorialLayoutDashboard.jsx';

export function StudioOSWorkspaceContent({
  activeTab,
  addContent,
  addPortfolio,
  addProject,
  contentItems,
  copyCaption,
  copiedId,
  deleteContent,
  deletePortfolio,
  deleteProject,
  exportPortfolio,
  handleBackToGallery,
  handleSelectArtwork,
  lastAddedPortfolioId,
  onOpenHomepageEditor,
  onToast,
  onUploadPortfolioImage,
  portfolioItems,
  projects,
  selectedArtworkProjectId,
  statusCounts,
  studioUser,
  tasks,
  onCompleteTask,
  onUpdateTask,
  updateContent,
  updatePortfolio,
  updateProject,
}) {
  return (
    <div className="space-y-32 page-fade">
      <div key={activeTab} className="page-fade">
        {activeTab === 'flow' && (
          <EditorialLayoutDashboard
            contentItems={contentItems}
            projects={projects}
            tasks={tasks}
            onCompleteTask={onCompleteTask}
            onUpdateTask={onUpdateTask}
          />
        )}

        {activeTab === 'projects' && (
          <ProjectDashboard
            projects={projects}
            statusCounts={statusCounts}
            tasks={tasks}
            onAdd={addProject}
            onDelete={deleteProject}
            onUpdate={updateProject}
            onOpenSpace={handleSelectArtwork}
            user={studioUser}
          />
        )}

        {activeTab === 'artwork' && (
          <div className="space-y-12">
            {!selectedArtworkProjectId ? (
              <BoardGallery
                projects={projects}
                onSelect={handleSelectArtwork}
              />
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="flex items-center justify-between border-b border-black/[0.05] pb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleBackToGallery}
                      className="grid h-10 w-10 place-items-center rounded-full border border-black/[0.05] bg-white text-studio-muted hover:text-studio-ink transition-all"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <h2 className="type-page-title text-2xl">
                        {projects.find((project) => project.id === selectedArtworkProjectId)?.name}
                      </h2>
                      <p className="type-label">Studio Space</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="type-label mr-2">Switch board</span>
                    <select
                      value={selectedArtworkProjectId}
                      onChange={(event) => handleSelectArtwork(event.target.value)}
                      className="bg-white border border-black/5 rounded-full px-4 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-studio-ink/10"
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  </div>
                </header>
                <ArtworkSpace
                  projectId={selectedArtworkProjectId}
                  user={studioUser}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && <TimelineCalculator projects={projects} onUpdate={updateProject} />}

        {activeTab === 'content' && (
          <ContentPlanner
            contentItems={contentItems}
            copiedId={copiedId}
            onAdd={addContent}
            onCopy={copyCaption}
            onDelete={deleteContent}
            onUpdate={updateContent}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioManager
            lastAddedPortfolioId={lastAddedPortfolioId}
            portfolioItems={portfolioItems}
            onAdd={addPortfolio}
            onDelete={deletePortfolio}
            onExport={exportPortfolio}
            onOpenHomepageEditor={onOpenHomepageEditor}
            onToast={onToast}
            onUpdate={updatePortfolio}
            onUploadImage={onUploadPortfolioImage}
          />
        )}
      </div>
    </div>
  );
}
