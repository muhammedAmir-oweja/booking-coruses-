import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <h1 className="m-0">Page Not Found</h1>
        </div>
      </div>
      <section className="content">
        <div className="container-fluid">
          <div className="error-page">
            <h2 className="headline text-warning">404</h2>
            <div className="error-content">
              <h3>
                <i className="fas fa-exclamation-triangle text-warning mr-2" />
                Oops! Page not found.
              </h3>
              <p>
                We could not find the page you were looking for.{' '}
                <Link to="/">Return to Dashboard</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
