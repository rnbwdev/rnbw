import React from 'react';

import {
  useDispatch,
  useSelector,
} from 'react-redux';

import {
  templateFetchRequest,
  templateGetPendingSelector,
  templateGetResponseSelector,
} from '@redux/template';

import styles from './Template.module.scss';

export default function Template() {
  const dispatch = useDispatch()
  const pending = useSelector(templateGetPendingSelector)
  const response = useSelector(templateGetResponseSelector)

  return (<div className={styles.Template}>
    {pending ? <span>Pending...</span> : null}
    <button onClick={() => dispatch(templateFetchRequest({ param1: 1, param2: 2 }))}>
      Fetch
    </button>
  </div>)
}