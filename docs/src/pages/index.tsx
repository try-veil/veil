import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faDiscord } from '@fortawesome/free-brands-svg-icons'
import styles from './index.module.css';

function HomepageHeader() {
  return (
    <section className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          Documentation for Veil
        </Heading>
        <p className="hero__subtitle">An opionated Caddy extension to sell, monitor, and manage your APIs.</p>
        <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/intro">
              Docs
            </Link>
          <Link
            className="button button--secondary button--lg"
            to="/blog">
            Blog
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="https://github.com/try-veil/veil">
            <FontAwesomeIcon icon={faGithub} /> GitHub
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="https://discord.gg/UTnAR6UpvS">
            <FontAwesomeIcon icon={faDiscord} /> Discord
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
    </Layout>
  );
}
