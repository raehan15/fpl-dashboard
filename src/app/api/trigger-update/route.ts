import { NextResponse } from 'next/server';

export async function POST() {
  const GITHUB_TOKEN = process.env.GITHUB_PAT;
  const REPO_OWNER = 'raehan15';
  const REPO_NAME = 'fpl-dashboard';
  const WORKFLOW_FILE = 'update_data.yml';
  const BRANCH = 'master'; // We saw 'master' in your git output earlier

  if (!GITHUB_TOKEN) {
    return NextResponse.json({ error: 'Missing GitHub Token' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${GITHUB_TOKEN}`,
        },
        body: JSON.stringify({
          ref: BRANCH,
        }),
      }
    );

    if (response.status === 204) {
      return NextResponse.json({ message: 'Update triggered successfully' });
    } else {
      const errorText = await response.text();
      return NextResponse.json({ error: `GitHub API Error: ${errorText}` }, { status: response.status });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
