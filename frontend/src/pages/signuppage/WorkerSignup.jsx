// WorkerSignup.jsx
import React, { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import SignupFooter from "../../signupcomponents/SignupFooter";

const WorkerSignUpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [sex, setSex] = useState("");
  const [email_address, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm_password, setConfirmPassword] = useState("");
  const [is_email_opt_in, setIsEmailOptIn] = useState(false);
  const [is_agreed_to_terms, setIsAgreedToTerms] = useState(false);
  const [is_agreed_to_policy_nda, setIsAgreedToPolicyNda] = useState(false);
  const [error_message, setErrorMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [info_message, setInfoMessage] = useState("");
  const [canResend, setCanResend] = useState(false);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [canResendAt, setCanResendAt] = useState(0);

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);

  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyRead, setPolicyRead] = useState(false);

  const [ndaOpen, setNdaOpen] = useState(false);
  const [ndaRead, setNdaRead] = useState(false);

  const now = () => Date.now();

  const normEmail = (s) => String(s || "").trim().toLowerCase();
  const isGmailEmail = (s) => normEmail(s).endsWith("@gmail.com");

  const passwordRules = useMemo(() => {
    const v = password || "";
    const len = v.length >= 8;
    const upper = /[A-Z]/.test(v);
    const num = /\d/.test(v);
    const special = /[^A-Za-z0-9]/.test(v);
    const match = password && password === confirm_password;
    const score = [len, upper, num, special].filter(Boolean).length;
    return { len, upper, num, special, match, score };
  }, [password, confirm_password]);

  const canResendOtp = now() >= canResendAt;
  const policyNdaReady = policyRead && ndaRead;

  const isFormValid =
    first_name.trim() !== "" &&
    last_name.trim() !== "" &&
    sex.trim() !== "" &&
    email_address.trim() !== "" &&
    isGmailEmail(email_address) &&
    passwordRules.len &&
    passwordRules.upper &&
    passwordRules.num &&
    passwordRules.special &&
    passwordRules.match &&
    is_agreed_to_terms &&
    is_agreed_to_policy_nda;

  const checkEmailAvailable = async () => {
    try {
      const email = normEmail(email_address);
      const resp = await axios.post(
        "http://localhost:5000/api/auth/check-email",
        { email },
        { withCredentials: true }
      );
      return resp?.data?.available === true;
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to check email.";
      setErrorMessage(msg);
      return false;
    }
  };

  const requestOtp = async () => {
    try {
      setOtpError("");
      setOtpInfo("Sending code…");
      setOtpSending(true);
      const email = normEmail(email_address);
      await axios.post(
        "http://localhost:5000/api/auth/request-otp",
        { email },
        { withCredentials: true }
      );
      setOtpInfo("We sent a 6-digit code to your email. Enter it below.");
      setCanResendAt(now() + 60000);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to send OTP.";
      setOtpError(msg);
      setOtpInfo("");
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setOtpError("");
      setOtpInfo("Verifying…");
      setOtpVerifying(true);
      const email = normEmail(email_address);
      await axios.post(
        "http://localhost:5000/api/auth/verify-otp",
        { email, code: otpCode },
        { withCredentials: true }
      );
      setOtpInfo("Verified! Creating your account…");
      setOtpOpen(false);
      await completeRegistration();
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid code.";
      setOtpError(msg);
      setOtpInfo("");
    } finally {
      setOtpVerifying(false);
    }
  };

  const completeRegistration = async () => {
    try {
      setLoading(true);
      const email = normEmail(email_address);
      const response = await axios.post(
        "http://localhost:5000/api/workers/register",
        {
          first_name,
          last_name,
          sex,
          email_address: email,
          password,
          is_agreed_to_terms,
          is_agreed_to_policy_nda,
        },
        { withCredentials: true }
      );
      if (response.status === 201) {
        const { auth_uid } = response.data.data || {};
        localStorage.setItem("first_name", first_name);
        localStorage.setItem("last_name", last_name);
        localStorage.setItem("sex", sex);
        if (auth_uid) localStorage.setItem("auth_uid", auth_uid);
        localStorage.setItem("role", "worker");
        setInfoMessage("Account created. You’re all set!");
        navigate("/workersuccess", { replace: true });
      }
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message;
      if (status === 429) {
        setErrorMessage("Too many verification emails were sent. Please wait a minute and try again.");
        setCanResend(true);
      } else if (status === 409) {
        setErrorMessage("This email already started signup. You can resend the verification email.");
        setCanResend(true);
      } else if (status === 502) {
        setErrorMessage("Email delivery failed. Check SMTP settings in Supabase.");
        setCanResend(true);
      } else if (msg) {
        setErrorMessage(msg);
      } else {
        setErrorMessage("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setCanResend(false);

    const email = normEmail(email_address);
    if (!isGmailEmail(email)) {
      setErrorMessage("Email must be a Gmail address.");
      return;
    }

    if (!passwordRules.match) {
      setErrorMessage("Passwords do not match");
      return;
    }
    if (!passwordRules.len || !passwordRules.upper || !passwordRules.num || !passwordRules.special) {
      setErrorMessage(
        "Password must be at least 8 characters and include a capital letter, a number, and a special character"
      );
      return;
    }

    if (!is_agreed_to_terms || !is_agreed_to_policy_nda) {
      setErrorMessage("Please agree to the required policies to continue.");
      return;
    }

    const available = await checkEmailAvailable();
    if (!available) {
      setErrorMessage("Email already in use");
      return;
    }

    setOtpOpen(true);
    setOtpCode("");
    setOtpInfo("");
    setOtpError("");
    await requestOtp();
  };

  const handleResend = async () => {
    try {
      setErrorMessage("");
      setInfoMessage("Resending verification email…");
      const email = normEmail(email_address);
      await axios.post("http://localhost:5000/api/auth/resend", { email });
      setInfoMessage("Verification email resent. Please check your inbox.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to resend verification.";
      setErrorMessage(msg);
    }
  };

  const openPrivacy = (e) => {
    e?.preventDefault?.();
    setPrivacyOpen(true);
  };

  const agreePrivacy = () => {
    setPrivacyRead(true);
    setIsAgreedToTerms(true);
    setPrivacyOpen(false);
  };

  const toggleAgreeTerms = () => {
    setIsAgreedToTerms((v) => {
      const next = !v;
      if (!next) setPrivacyRead(false);
      return next;
    });
  };

  const openPolicy = (e) => {
    e?.preventDefault?.();
    setPolicyOpen(true);
  };

  const agreePolicy = () => {
    setPolicyRead(true);
    setPolicyOpen(false);
    if (ndaRead) setIsAgreedToPolicyNda(true);
  };

  const openNda = (e) => {
    e?.preventDefault?.();
    setNdaOpen(true);
  };

  const agreeNda = () => {
    setNdaRead(true);
    setNdaOpen(false);
    if (policyRead) setIsAgreedToPolicyNda(true);
  };

  const handlePolicyNdaCheckbox = () => {
    if (!policyNdaReady) return;
    if (is_agreed_to_policy_nda) {
      setIsAgreedToPolicyNda(false);
      setPolicyRead(false);
      setNdaRead(false);
      return;
    }
    setIsAgreedToPolicyNda(true);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white overflow-hidden">
      <div className="bg-white z-50">
        <div className="max-w-[1540px] mx-auto flex justify-between items-center px-6 py-4 h-[90px]">
          <div className="flex items-center space-x-6">
            <Link to="/">
              <img src="/jdklogo.png" alt="Logo" className="h-48 w-48 object-contain" />
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <span className="text-md">Want to hire a worker? </span>
            <Link to="/clientsignup" className="text-[#008cfc]">
              Apply as Client
            </Link>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center flex-grow px-4 py-12 -mt-[84px]">
        <div className="bg-white p-8 max-w-lg w-full">
          <h2 className="text-3xl font-semibold text-center mb-4">
            Sign up to be a <span className="text-[#008cfc]">Worker</span>
          </h2>
          <div className="w-16 h-[2px] bg-gray-300 mx-auto mb-4"></div>

          <div className="space-y-4">
            <div className="flex space-x-4">
              <div className="w-full">
                <label htmlFor="first_name" className="block text-sm font-semibold mb-1">
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={first_name}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                />
              </div>
              <div className="w-full">
                <label htmlFor="last_name" className="block text-sm font-semibold mb-1">
                  Last Name
                </label>
                <input
                  id="last_name"
                  type="text"
                  value={last_name}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="sex" className="block text-sm font-semibold mb-1">
                Sex
              </label>
              <select
                id="sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc] appearance-none bg-no-repeat"
                style={{ backgroundImage: "none" }}
              >
                <option value="">Select sex</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label htmlFor="email_address" className="block text-sm font-semibold mb-1">
                Email Address
              </label>
              <input
                id="email_address"
                type="email"
                value={email_address}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="@gmail.com"
                className="w-full p-2.5 border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]"
              />
              {email_address && !isGmailEmail(email_address) && (
                <p className="text-xs text-red-600 mt-1">Email must be a Gmail address.</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-1">
                Password (8 or more characters)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={`w-full p-2.5 ${password ? "pr-20" : ""} border-2 rounded-md border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#008cfc]`}
                  autoComplete="new-password"
                />
                {password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-2 my-auto text-sm font-medium text-[#008cfc] hover:underline px-2"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                )}
              </div>

              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={[
                      "h-full transition-all",
                      !password
                        ? "bg-gray-300 w-0"
                        : passwordRules.score <= 1
                        ? "bg-red-500 w-1/4"
                        : passwordRules.score === 2
                        ? "bg-amber-500 w-2/4"
                        : passwordRules.score === 3
                        ? "bg-yellow-500 w-3/4"
                        : "bg-emerald-500 w-full",
                    ].join(" ")}
                  />
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <li className={passwordRules.len ? "text-emerald-600" : "text-gray-500"}>At least 8 characters</li>
                  <li className={passwordRules.upper ? "text-emerald-600" : "text-gray-500"}>One uppercase letter</li>
                  <li className={passwordRules.num ? "text-emerald-600" : "text-gray-500"}>One number</li>
                  <li className={passwordRules.special ? "text-emerald-600" : "text-gray-500"}>One special character</li>
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-sm font-semibold mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirm ? "text" : "password"}
                  value={confirm_password}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className={[
                    `w-full p-2.5 ${confirm_password ? "pr-20" : ""} border-2 rounded-md focus:outline-none focus:ring-2`,
                    passwordRules.match || !confirm_password ? "border-gray-300 focus:ring-[#008cfc]" : "border-red-300 focus:ring-red-400",
                  ].join(" ")}
                  autoComplete="new-password"
                />
                {confirm_password.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute inset-y-0 right-2 my-auto text-sm font-medium text-[#008cfc] hover:underline px-2"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                )}
              </div>
              {confirm_password &&
              (!passwordRules.match || !passwordRules.len || !passwordRules.upper || !passwordRules.num || !passwordRules.special) ? (
                <p className="text-xs text-red-600 mt-1">
                  {!passwordRules.match
                    ? "Passwords do not match"
                    : "Password must be at least 8 characters and include a capital letter, a number, and a special character"}
                </p>
              ) : null}
            </div>
          </div>

          <label htmlFor="agree_terms" className="mt-4 flex items-start gap-3 select-none cursor-pointer">
            <input
              id="agree_terms"
              type="checkbox"
              checked={is_agreed_to_terms}
              onChange={toggleAgreeTerms}
              disabled={!privacyRead}
              className={[
                "mt-0.5 h-4 w-4 min-h-4 min-w-4 shrink-0 rounded border-gray-300 accent-[#008cfc] focus:outline-none focus:ring-2 focus:ring-[#008cfc] focus:ring-offset-2",
                !privacyRead ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            />
            <span className="text-sm leading-5 text-gray-800">
              JDK HOMECARE’s{" "}
              <Link
                to="#"
                onClick={(e) => {
                  e.stopPropagation();
                  openPrivacy(e);
                }}
                className="text-[#008cfc] underline"
              >
                Privacy Policy
              </Link>
              .
              {!privacyRead && (
                <span className="block text-xs text-gray-500 mt-1">Please read the Privacy Policy to enable this checkbox.</span>
              )}
            </span>
          </label>

          <label htmlFor="agree_policy_nda" className="mt-2 flex items-start gap-3 select-none cursor-pointer">
            <input
              id="agree_policy_nda"
              type="checkbox"
              checked={is_agreed_to_policy_nda}
              onChange={handlePolicyNdaCheckbox}
              disabled={!policyNdaReady}
              className={[
                "mt-0.5 h-4 w-4 min-h-4 min-w-4 shrink-0 rounded border-gray-300 accent-[#008cfc] focus:outline-none focus:ring-2 focus:ring-[#008cfc] focus:ring-offset-2",
                !policyNdaReady ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            />
            <span className="text-sm leading-5 text-gray-800">
              JDK HOMECARE’s{" "}
              <Link
                to="#"
                onClick={(e) => {
                  e.stopPropagation();
                  openPolicy(e);
                }}
                className="text-[#008cfc] underline"
              >
                Policy Agreement
              </Link>{" "}
              and{" "}
              <Link
                to="#"
                onClick={(e) => {
                  e.stopPropagation();
                  openNda(e);
                }}
                className="text-[#008cfc] underline"
              >
                Non-Disclosure Agreement
              </Link>
              .
              {!policyNdaReady && (
                <span className="block text-xs text-gray-500 mt-1">Please read and agree to both links to enable this checkbox.</span>
              )}
            </span>
          </label>

          <div className="text-center mt-4">
            <button
              disabled={!isFormValid || loading}
              className={`py-2 px-6 rounded-md w-full ${
                !isFormValid || loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-white border-2 transition border-[#008cfc] hover:bg-[#008cfc] text-[#008cfc] hover:text-white"
              }`}
              onClick={handleSubmit}
            >
              {loading ? "Submitting…" : "Create my account"}
            </button>
          </div>

          {info_message && <div className="text-[#008cfc] text-center mt-4">{info_message}</div>}
          {error_message && <div className="text-red-500 text-center mt-4">{error_message}</div>}

          {canResend && (
            <div className="text-center mt-2">
              <button type="button" onClick={handleResend} className="text-[#008cfc] underline">
                Resend verification email
              </button>
            </div>
          )}

          <div className="text-center mt-4">
            <span>Already have an account? </span>
            <Link to="/login" className="text-[#008cfc] underline">
              Log In
            </Link>
          </div>
        </div>
      </div>

      {otpOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-sm rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-2 text-center">Verify your email</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Enter the 6-digit code we sent to <b>{email_address || "your email"}</b>.
            </p>
            <input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full p-3 border-2 rounded-md border-gray-300 text-center tracking-widest text-lg"
            />
            {otpInfo && <div className="text-[#008cfc] text-center mt-3">{otpInfo}</div>}
            {otpError && <div className="text-red-600 text-center mt-3">{otpError}</div>}

            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setOtpOpen(false)} className="px-4 py-2 rounded-md border border-gray-300" disabled={otpVerifying}>
                Cancel
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={requestOtp}
                  disabled={!canResendOtp || otpSending}
                  className={`px-4 py-2 rounded-md border ${
                    !canResendOtp || otpSending ? "opacity-50 cursor-not-allowed" : "border-[#008cfc] text-[#008cfc]"
                  }`}
                >
                  {otpSending ? "Sending…" : canResendOtp ? "Resend code" : "Wait…"}
                </button>
                <button
                  onClick={verifyOtp}
                  disabled={otpCode.length !== 6 || otpVerifying}
                  className="px-4 py-2 rounded-md bg-[#008cfc] text-white"
                >
                  {otpVerifying ? "Verifying…" : "Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {privacyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Privacy Policy</h3>
                <p className="text-sm text-gray-600 mt-1">Please read the policy below. Click “I Agree” to enable and check the checkbox.</p>
              </div>
            </div>

            <div className="mt-4 max-h-[55vh] overflow-auto border border-gray-200 rounded-md p-4 text-sm text-gray-800 leading-6">
              <p className="font-semibold">JDK HOMECARE Privacy Policy</p>
              <p className="mt-2">
                This Privacy Policy explains how JDK HOMECARE collects, uses, stores, and protects your information when you use our platform as a worker.
              </p>

              <p className="mt-4 font-semibold">1. Information We Collect</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Account information (name, email, sex) you provide during registration.</li>
                <li>Work/service-related information you submit while using worker features.</li>
                <li>Device and usage data (basic logs, timestamps) to help secure and improve the platform.</li>
              </ul>

              <p className="mt-4 font-semibold">2. How We Use Your Information</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>To create and manage your worker account.</li>
                <li>To provide core features (applications, matching, notifications).</li>
                <li>To improve security, prevent fraud, and comply with legal obligations.</li>
                <li>To communicate important updates related to your account and activity.</li>
              </ul>

              <p className="mt-4 font-semibold">3. Data Sharing</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  We may share limited information with clients only as necessary to fulfill a service request (e.g., name and service-related details).
                </li>
                <li>
                  We do not sell your personal information. We may share information when required by law or to protect our users and platform.
                </li>
              </ul>

              <p className="mt-4 font-semibold">4. Data Retention</p>
              <p className="mt-2">We keep information only as long as needed to operate the service and meet legal and security requirements.</p>

              <p className="mt-4 font-semibold">5. Security</p>
              <p className="mt-2">
                We use reasonable safeguards to protect your information. No method of transmission or storage is 100% secure, but we work to protect your data.
              </p>

              <p className="mt-4 font-semibold">6. Updates to this Policy</p>
              <p className="mt-2">We may update this policy from time to time. Continued use of the platform means you accept the updated policy.</p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setPrivacyOpen(false)} className="px-4 py-2 rounded-md border border-gray-300">
                Cancel
              </button>
              <button type="button" onClick={agreePrivacy} className="px-4 py-2 rounded-md bg-[#008cfc] text-white">
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {policyOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Policy Agreement</h3>
                <p className="text-sm text-gray-600 mt-1">Please read the policy below. Click “I Agree” to continue.</p>
              </div>
            </div>

            <div className="mt-4 max-h-[55vh] overflow-auto border border-gray-200 rounded-md p-4 text-sm text-gray-800 leading-6">
              <p className="font-semibold">JDK HOMECARE Worker Policy Agreement</p>
              <p className="mt-2">
                This Worker Policy works together with the Client Policy to keep jobs safe, properly supported, and recorded. By using JDK HOMECARE as a worker, you agree to the rules below when interacting with clients on the platform.
              </p>

              <p className="mt-4 font-semibold">1. Acceptable Use (Worker)</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Provide accurate information in your account and applications.</li>
                <li>Use the platform only for legitimate home service and maintenance work.</li>
                <li>Act professionally: communicate respectfully, follow agreed scope, and do not abuse, harass, scam, or attempt to harm clients or other users.</li>
              </ul>

              <p className="mt-4 font-semibold">2. Off-Platform Transactions Are Not Allowed (Worker)</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  You must not request, offer, or accept payment or any transaction outside JDK HOMECARE for services found, arranged, or coordinated through the platform, including asking for cash, bank transfer, or e-wallet payments to bypass JDK HOMECARE.
                </li>
                <li>
                  You must not encourage clients to cancel or move a booking off-platform, and you must not share or request contact details (phone, social media, external chat apps) for the purpose of taking jobs outside JDK HOMECARE.
                </li>
                <li>
                  Keep bookings, agreements, and payments inside JDK HOMECARE so support can assist with records, disputes, and safety issues. If a client asks to pay outside the platform, do not proceed and report it through JDK HOMECARE.
                </li>
              </ul>

              <p className="mt-4 font-semibold">3. Account Responsibilities</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>You are responsible for maintaining the confidentiality of your account.</li>
                <li>You agree not to share your login credentials with others.</li>
                <li>You agree to notify us if you suspect unauthorized access to your account.</li>
              </ul>

              <p className="mt-4 font-semibold">4. Platform Integrity</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>No attempts to bypass security, disrupt services, or misuse platform features.</li>
                <li>No uploading of harmful or illegal content.</li>
                <li>We may suspend or terminate accounts that violate policies or threaten platform safety.</li>
              </ul>

              <p className="mt-4 font-semibold">5. No Refund Agreement</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  By using JDK HOMECARE, you acknowledge that fees paid through the platform are generally non-refundable once a service booking is confirmed or processed.
                </li>
                <li>
                  Disputes, failed service attempts, or cancellations may be reviewed by JDK HOMECARE support, but any refund or credit is not guaranteed and may be provided only when required by applicable law or when JDK HOMECARE determines it is appropriate.
                </li>
                <li>
                  You agree to provide accurate details and cooperate with verification requests (e.g., messages, timestamps, photos) during dispute review.
                </li>
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setPolicyOpen(false)} className="px-4 py-2 rounded-md border border-gray-300">
                Cancel
              </button>
              <button type="button" onClick={agreePolicy} className="px-4 py-2 rounded-md bg-[#008cfc] text-white">
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {ndaOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">Non-Disclosure Agreement</h3>
                <p className="text-sm text-gray-600 mt-1">Please read the agreement below. Click “I Agree” to continue.</p>
              </div>
            </div>

            <div className="mt-4 max-h-[55vh] overflow-auto border border-gray-200 rounded-md p-4 text-sm text-gray-800 leading-6">
              <p className="font-semibold">JDK HOMECARE Non-Disclosure Agreement (NDA)</p>
              <p className="mt-2">
                This Worker NDA supports the same confidentiality goals as the Client NDA, but focuses on the information workers may access while delivering services and communicating with clients through the platform.
              </p>

              <p className="mt-4 font-semibold">1. What You Must Keep Confidential</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>
                  Client and household details learned through a job (address, access instructions, schedules, contact info, photos, messages, and any personal circumstances shared for the service).
                </li>
                <li>Job details that are not publicly shared (service request details, pricing/quotes, work notes, and platform chat messages).</li>
                <li>JDK HOMECARE platform information (internal processes, moderation decisions, non-public features, and operational details).</li>
              </ul>

              <p className="mt-4 font-semibold">2. How You May Use Confidential Information</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Use it only to complete the service, coordinate with the client, and comply with platform requirements.</li>
                <li>Do not post, sell, share, or publish any client/job information (including screenshots) outside the platform.</li>
                <li>If you need to share information for legitimate reasons (e.g., emergency, legal requirement), share only the minimum necessary.</li>
              </ul>

              <p className="mt-4 font-semibold">3. Special Rules for Photos, Videos, and Screenshots</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>No sharing service photos or videos outside JDK HOMECARE without the client’s permission.</li>
                <li>No sharing screenshots of messages, profiles, or job details to third parties.</li>
                <li>If proof is required for disputes, submit it only through the platform’s reporting/support process.</li>
              </ul>

              <p className="mt-4 font-semibold">4. Exceptions</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Information that is publicly available through no fault of your own.</li>
                <li>Information required to be disclosed by law or valid legal process.</li>
                <li>Information disclosed to prevent immediate harm or respond to emergencies.</li>
              </ul>

              <p className="mt-4 font-semibold">5. Duration</p>
              <p className="mt-2">
                Your confidentiality obligations continue during and after your use of the platform, to the extent allowed by applicable law.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setNdaOpen(false)} className="px-4 py-2 rounded-md border border-gray-300">
                Cancel
              </button>
              <button type="button" onClick={agreeNda} className="px-4 py-2 rounded-md bg-[#008cfc] text-white">
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 w-full">
        <SignupFooter />
      </div>
    </div>
  );
};

export default WorkerSignUpPage;
