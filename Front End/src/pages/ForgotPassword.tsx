import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  return (
    <div className="hold-transition login-page">
      <div className="login-box">
        <div className="login-logo">
          <i className="fas fa-graduation-cap mr-2" style={{ color: '#007bff' }} />
          <b>Course</b> Booking
        </div>

        <div className="card">
          <div className="card-body login-card-body">
            <p className="login-box-msg">Forgot your password?</p>

            <div className="alert alert-info text-center">
              <i className="fas fa-info-circle mr-2" />
              Password reset is not available yet.
              <br />
              Please contact your administrator to reset your password.
            </div>

            <div className="mt-3 text-center">
              <Link to="/login" className="btn btn-default btn-block">
                <i className="fas fa-arrow-left mr-1" /> Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
