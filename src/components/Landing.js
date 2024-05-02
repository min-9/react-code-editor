import React, { useCallback, useEffect, useState } from 'react';
import CodeEditorWindow from './CodeEditorWindow';
import axios from 'axios';
import { classnames } from '../utils/general';
import { languageOptions } from '../constants/languageOptions';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { defineTheme } from '../lib/defineTheme';
import useKeyPress from '../hooks/useKeyPress';
import Footer from './Footer';
import OutputWindow from './OutputWindow';
import OutputDetails from './OutputDetails';
import ThemeDropdown from './ThemeDropdown';
import LanguagesDropdown from './LanguagesDropdown';

const javascriptDefault =
  "const formatter = n => (n < 10 ? ' ' : '') + n;\n\n" +
  'for (let i = 1; i < 8; i+=3) {\n' +
  '  for (let j = 1; j < 10; j++) {\n' +
  '    let results = [i*j, (i+1)*j, (i+2)*j].map(formatter);\n' +
  // eslint-disable-next-line no-template-curly-in-string
  "    let line = [0, 1, 2].map(n => `${i+n} x ${j} = ${results[n]}`).join('\\t\\t');\n" +
  '    console.log(line);\n' +
  '  }\n' +
  '  console.log();\n' +
  '}';

const Landing = () => {
  const [code, setCode] = useState(javascriptDefault);
  const [outputDetails, setOutputDetails] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [theme, setTheme] = useState('cobalt');
  const [language, setLanguage] = useState(languageOptions[0]);

  const enterPress = useKeyPress('Enter');
  const ctrlPress = useKeyPress('Control');

  const onSelectChange = sl => {
    console.log('selected Option...', sl);
    setLanguage(sl);
  };

  const checkStatus = useCallback(async token => {
    const options = {
      method: 'GET',
      url: process.env.REACT_APP_RAPID_API_URL + '/' + token,
      params: { base64_encoded: 'true', fields: '*' },
      headers: {
        'X-RapidAPI-Host': process.env.REACT_APP_RAPID_API_HOST,
        'X-RapidAPI-Key': process.env.REACT_APP_RAPID_API_KEY,
      },
    };
    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      // Processed - we have a result
      if (statusId === 1 || statusId === 2) {
        // still processing
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutputDetails(response.data);
        showSuccessToast(`Compiled Successfully!`);
        console.log('response.data', response.data);
        return;
      }
    } catch (err) {
      console.log('err', err);
      setProcessing(false);
      showErrorToast();
    }
  }, []);

  const handleCompile = useCallback(() => {
    setProcessing(true);
    const formData = {
      language_id: language.id,
      // encode source code in base64
      source_code: btoa(code),
      // stdin: btoa(customInput),
    };
    const options = {
      method: 'POST',
      url: process.env.REACT_APP_RAPID_API_URL,
      params: { base64_encoded: 'true', fields: '*' },
      headers: {
        'content-type': 'application/json',
        'Content-Type': 'application/json',
        'X-RapidAPI-Host': process.env.REACT_APP_RAPID_API_HOST,
        'X-RapidAPI-Key': process.env.REACT_APP_RAPID_API_KEY,
      },
      data: formData,
    };

    axios
      .request(options)
      .then(response => {
        console.log('res.data', response.data);
        const token = response.data.token;
        checkStatus(token);
      })
      .catch(err => {
        let error = err.response ? err.response.data : err;
        // get error status
        let status = err.response.status;
        console.log('status', status);
        if (status === 429) {
          console.log('too many requests', status);

          showErrorToast(
            `Quota of 100 requests exceeded for the Day! Please read the blog on freeCodeCamp to learn how to setup your own RAPID API Judge0!`,
            10000
          );
        }
        setProcessing(false);
        console.log('catch block...', error);
      });
  }, [checkStatus, code, language.id]);

  useEffect(() => {
    if (enterPress && ctrlPress) {
      console.log('enterPress', enterPress);
      console.log('ctrlPress', ctrlPress);
      if (document.body.clientWidth < 1280)
        window.scrollTo({
          top: document.body.scrollHeight, // <- 페이지 총 Height
          behavior: 'smooth',
        });
      handleCompile();
    }
  }, [ctrlPress, enterPress, handleCompile]);

  const onChange = (action, data) => {
    switch (action) {
      case 'code': {
        setCode(data);
        break;
      }
      default: {
        console.warn('case not handled!', action, data);
      }
    }
  };

  function handleThemeChange(th) {
    const theme = th;
    console.log('theme...', theme);

    if (['light', 'vs-dark'].includes(theme.value)) {
      setTheme(theme);
    } else {
      defineTheme(theme.value).then(_ => setTheme(theme));
    }
  }

  useEffect(() => {
    defineTheme('oceanic-next').then(_ =>
      setTheme({ value: 'oceanic-next', label: 'Oceanic Next' })
    );
  }, []);

  const showSuccessToast = msg => {
    toast.success(msg || `Compiled Successfully!`, {
      position: 'top-right',
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };
  const showErrorToast = (msg, timer) => {
    toast.error(msg || `Something went wrong! Please try again.`, {
      position: 'top-right',
      autoClose: timer ? timer : 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      <div className="flex flex-row mt-4">
        <div className="px-8 py-2">
          <LanguagesDropdown onSelectChange={onSelectChange} />
        </div>
        <div className="px-8 py-2">
          <ThemeDropdown handleThemeChange={handleThemeChange} theme={theme} />
        </div>
        <div className="px-8 py-2">
          <button
            onClick={() => {
              handleCompile();
              if (document.body.clientWidth < 1280)
                window.scrollTo({
                  top: document.body.scrollHeight, // <- 페이지 총 Height
                  behavior: 'smooth',
                });
            }}
            disabled={!code}
            className={classnames(
              'px-3 h-full border-2 border-black z-10 rounded-md hover:shadow transition duration-200 bg-white flex-shrink-0',
              !code ? 'opacity-50' : ''
            )}
          >
            {processing ? 'Processing...' : 'Run (CTRL+ENTER)'}
          </button>
        </div>
      </div>
      <div className="flex flex-col xl:flex-row gap-4 items-start px-8 py-4 mb-8 h-screen">
        <div className="flex flex-col w-full h-full justify-start items-end">
          <CodeEditorWindow
            code={code}
            onChange={onChange}
            language={language?.value}
            theme={theme.value}
          />
        </div>

        <div className="right-container flex flex-shrink-0 w-full xl:w-[30%] flex-col">
          <OutputWindow outputDetails={outputDetails} />
          <div className="flex flex-col items-end">
            {/* <CustomInput
              customInput={customInput}
              setCustomInput={setCustomInput}
            /> */}
          </div>
          {outputDetails && <OutputDetails outputDetails={outputDetails} />}
        </div>
      </div>
      <Footer name="CodRush" />
    </>
  );
};
export default Landing;
