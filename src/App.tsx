import React, { useEffect, useRef, useState } from 'react';
import { GitHubStore } from './stores';
import {
  GitHubData,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepo,
} from './stores/gitHubStore';
import Header from './components/Header/Header';
import PullRequests from './components/Pull Requests/PullRequests';
import Issues from './components/Issues/Issues';
import PullRequest from './components/Pull Request/PullRequest';
import { GrFormNext, GrFormPrevious } from 'react-icons/gr';

const App: React.FC = () => {
  const gitHubStore = GitHubStore;
  const [gitHubData, setGitHubData] = useState<GitHubData | null>(
    gitHubStore.getGitHubData()
  );
  const [currentRepos, setCurrentRepos] = useState<GitHubRepo[] | undefined>(
    gitHubData?.myRepositories
  );
  const [currentRepoIndex, setCurrentRepoIndex] = useState(0);
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[] | null>(
    null
  );
  const [issues, setIssues] = useState<GitHubIssue[] | null>(null);
  const [myPullRequests, setMyPullRequests] = useState<{ authored: GitHubPullRequest[]; reviews: GitHubPullRequest[] } | null>(null);
  const [prTab, setPrTab] = useState<'authored' | 'reviews'>('authored');
  const [prIndex, setPrIndex] = useState(0);
  const visiblePrs = myPullRequests?.[prTab] ?? [];

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.deltaY > 0 || event.deltaX > 0) setPrIndex((i) => Math.min(i + 1, visiblePrs.length - 1));
      if (event.deltaY < 0 || event.deltaX < 0) setPrIndex((i) => Math.max(i - 1, 0));
    };
    list.addEventListener('wheel', onWheel, { passive: false });
    return () => list.removeEventListener('wheel', onWheel);
  }, [visiblePrs.length]);
  useEffect(() => setPrIndex(0), [prTab, myPullRequests]);
  const [filter, setFilter] = useState<'repos' | 'stars'>('repos');
  const [isTallEnough, setIsTallEnough] = useState(false);

  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filter === 'repos') {
      setCurrentRepos(gitHubData?.myRepositories);
      setCurrentRepoIndex(0);
    }
    if (filter === 'stars') {
      setCurrentRepos(gitHubData?.starredRepositories);
      setCurrentRepoIndex(0);
    }
  }, [filter]);

  useEffect(() => {
    if (filter === 'stars') {
      setCurrentRepos(gitHubData?.starredRepositories);
      if (
        !gitHubData?.starredRepositories ||
        currentRepoIndex >= gitHubData.starredRepositories.length
      ) {
        setCurrentRepoIndex(0);
      }
      return;
    }

    // If there are no repositories, fallback to 'stars' filter
    if (gitHubData?.myRepositories && gitHubData.myRepositories.length === 0) {
      setFilter('stars');
      return;
    }

    // Fallback to 'repos' filter
    setCurrentRepos(gitHubData?.myRepositories);
    if (
      !gitHubData?.myRepositories ||
      currentRepoIndex >= gitHubData.myRepositories.length
    ) {
      setCurrentRepoIndex(0);
    }
  }, [gitHubData]);

  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === container) {
          setIsTallEnough(entry.contentRect.height > 400);
        }
      }
    });

    resizeObserver.observe(container);

    // Cleanup observer on component unmount
    return () => {
      resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, [contentContainerRef.current]);

  useEffect(() => {
    const handleGitHubData = async (data: GitHubData | null) => {
      if (!data) {
        console.log('No GitHub data available');
        return;
      }
      console.log('GitHub data updated:', data);
      setGitHubData(data);
    };

    const handlePullRequests = async (data: GitHubPullRequest[] | null) => {
      setPullRequests(data);
    };

    const handleIssues = async (data: GitHubIssue[] | null) => {
      setIssues(data);
    };

    const removeListener = gitHubStore.on(handleGitHubData);
    const removeMyPulls = gitHubStore.onMyPullRequestsRetrieved(setMyPullRequests);
    gitHubStore.requestMyOpenPullRequests();
    const removePullRequestsListener =
      gitHubStore.onPullRequestsRetrieved(handlePullRequests);
    const removeIssuesListener = gitHubStore.onIssuesRetrieved(handleIssues);

    return () => {
      removeListener();
      removeMyPulls();
      removePullRequestsListener();
      removeIssuesListener();
    };
  }, []);

  function handleBackClick() {
    setPullRequests(null);
    setIssues(null);
  }

  function handleViewPullRequestsClick(ownerName: string, repoName: string) {
    gitHubStore.getPullRequests(ownerName, repoName);
  }

  function handleViewIssuesClick(ownerName: string, repoName: string) {
    gitHubStore.getIssues(ownerName, repoName);
  }

  function getContent() {
    if (!gitHubData) {
      return (
        <div className='validation'>
          <h2>Loading...</h2>
        </div>
      );
    }

    if (!gitHubData.user) {
      return (
        <div className='validation'>
          <h1>Unable to retrieve Authenticated User</h1>
          <h2>
            Ensure you have you GitHub Access Token configured in Settings
          </h2>
        </div>
      );
    }

    return (
      <div className='contentContainer' ref={contentContainerRef}>
        <div className='my-pr-dashboard'>
          <header className='my-pr-header'><h1>Pull requests</h1></header>
          <nav className='my-pr-tabs'><button className={prTab === 'authored' ? 'active' : ''} onClick={() => setPrTab('authored')}>Opened by me ({myPullRequests?.authored.length ?? '…'})</button><button className={prTab === 'reviews' ? 'active' : ''} onClick={() => setPrTab('reviews')}>Requested for my review ({myPullRequests?.reviews.length ?? '…'})</button></nav>
          <div className='my-pr-carousel'><button aria-label='Previous pull request' disabled={prIndex === 0} onClick={() => setPrIndex((i) => Math.max(i - 1, 0))}><GrFormPrevious size={42}/></button>
            <section ref={listRef} className='my-pr-list'>{visiblePrs.map((pr, index) => <div className={`my-pr-card ${index === prIndex ? 'selected' : ''}`} key={pr.id} onClick={() => setPrIndex(index)}><small>{pr.url.split('/').slice(3, 5).join(' /')} · #{pr.number}</small><PullRequest pullRequest={pr} onOpenClick={(url) => gitHubStore.openURL(url)} /><p className='pr-status'>Review: {pr.reviewStatus ?? 'Pending'}{pr.checksStatus && <>{' · '}Checks: {pr.checksStatus}</>}</p></div>)}{myPullRequests && !visiblePrs.length && <p className='my-pr-empty'>No pull requests in this tab.</p>}</section>
            <button aria-label='Next pull request' disabled={prIndex >= visiblePrs.length - 1} onClick={() => setPrIndex((i) => Math.min(i + 1, visiblePrs.length - 1))}><GrFormNext size={42}/></button></div>
          {!myPullRequests && <p className='my-pr-empty'>Loading your pull requests…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className='appContainer w-screen h-screen'>
      <Header lastUpdated={gitHubData?.lastUpdated} />
      {getContent()}
    </div>
  );
};

export default App;
