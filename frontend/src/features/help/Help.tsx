import { BookOpen, Keyboard, LifeBuoy, ShieldCheck } from "lucide-react";
import "./Help.css";

const topics = [
  {
    title: "Workspaces and members",
    description: "A workspace is the shared area for your team. Owners and admins can add registered users by email, remove members, and manage roles.",
  },
  {
    title: "Projects",
    description: "Create projects inside a workspace to group related tasks. Projects can be archived and reactivated. Deleting a project keeps its tasks and makes them unassigned.",
  },
  {
    title: "Tasks",
    description: "Tasks support descriptions, priorities, status, due dates, assignees, comments, and activity history. Search is performed across the workspace task records.",
  },
  {
    title: "Notifications and live updates",
    description: "Notifications are created for task assignments, status changes, and comments. Keep the application open to receive live updates over the WebSocket connection.",
  },
];

function Help() {
  return (
    <div className="help-page">
      <header className="help-heading">
        <div className="help-icon"><LifeBuoy size={23} /></div>
        <div><p className="greeting">SUPPORT</p><h1>Help & Support</h1><p className="dashboard-subtitle">A quick guide to using CollabSpace.</p></div>
      </header>
      <section className="help-shortcuts">
        <div><Keyboard size={20}/><div><strong>Search tasks</strong><span>Press Ctrl + K (or Cmd + K on Mac) to focus global task search.</span></div></div>
        <div><ShieldCheck size={20}/><div><strong>Account security</strong><span>Use Settings to update your profile or change your password.</span></div></div>
        <div><BookOpen size={20}/><div><strong>Team access</strong><span>Only workspace members can access workspace tasks and projects.</span></div></div>
      </section>
      <section className="help-topics"><h2>Getting started</h2>{topics.map((topic) => <article key={topic.title}><h3>{topic.title}</h3><p>{topic.description}</p></article>)}</section>
      <p className="help-note">If something does not load, check your network connection and ask your workspace administrator to confirm that the backend and database services are running.</p>
    </div>
  );
}
export default Help;
