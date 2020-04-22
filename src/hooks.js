import { useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useHistory, useLocation } from 'react-router-dom'
import FilecoinNumber from '@openworklabs/filecoin-number'

import {
  switchWallet,
  switchNetwork,
  updateBalance,
  updateProgress,
  fetchedConfirmedMessagesSuccess,
  fetchedConfirmedMessagesFailure,
  fetchingConfirmedMessages,
  populateRedux
} from './store/actions'
import { getMsgsFromCache } from './store/cache'
import { isValidBrowser } from './utils'

export const useFilecoin = () => {
  const dispatch = useDispatch()

  /* poll for details about balance of single selected account */
  const { selectedWalletIdx, wallets, walletProvider } = useSelector(state => {
    return {
      selectedWalletIdx: state.selectedWalletIdx,
      wallets: state.wallets,
      walletProvider: state.walletProvider
    }
  })

  const timeout = useRef()

  const pollBalance = useCallback(() => {
    // avoid race conditions (heisman)
    clearTimeout(timeout.current)
    timeout.current = setTimeout(async () => {
      if (!wallets[selectedWalletIdx] || !walletProvider)
        return await pollBalance()

      const latestBalance = await walletProvider.getBalance(
        wallets[selectedWalletIdx].address
      )
      if (!latestBalance.isEqualTo(wallets[selectedWalletIdx].balance)) {
        dispatch(updateBalance(latestBalance, selectedWalletIdx))
      }
      await pollBalance()
    }, 3000)

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current)
      }
    }
  }, [wallets, dispatch, selectedWalletIdx, walletProvider])

  useEffect(pollBalance, [selectedWalletIdx, pollBalance])
  return
}

export const useWallets = () => {
  const { wallets, selectedWallet, walletProvider, walletType } = useSelector(
    state => {
      const selectedWallet =
        state.wallets.length > state.selectedWalletIdx
          ? state.wallets[state.selectedWalletIdx]
          : { balance: new FilecoinNumber('0', 'attofil'), address: '' }

      return {
        wallets: state.wallets,
        selectedWallet,
        walletProvider: state.walletProvider,
        walletType: state.walletType
      }
    }
  )

  const dispatch = useDispatch()

  const selectWallet = useCallback(
    async index => {
      dispatch(switchWallet(index))
      const balance = new FilecoinNumber(
        await walletProvider.getBalance(wallets[index].address),
        'attofil'
      )
      dispatch(updateBalance(balance, index))
    },
    [wallets, dispatch, walletProvider]
  )

  return {
    wallets,
    selectWallet,
    selectedWallet,
    walletType,
    walletProvider
  }
}

export const useBalance = index =>
  useSelector(state => {
    // optional account index param, default to selected account
    const walletIdx = index ? index : state.selectedWalletIdx
    return state.wallets[walletIdx]
      ? state.wallets[walletIdx].balance
      : new FilecoinNumber('0', 'attofil')
  })

export const useTransactions = index => {
  const dispatch = useDispatch()

  const {
    confirmed,
    links,
    loading,
    loadedSuccess,
    loadedFailure,
    pending,
    selectedWallet
  } = useSelector(state => {
    const selectedWallet =
      state.wallets.length > state.selectedWalletIdx
        ? state.wallets[state.selectedWalletIdx]
        : { balance: new FilecoinNumber('0', 'attofil'), address: '' }
    return {
      confirmed: state.messages.confirmed,
      links: state.messages.links,
      pending: state.messages.pending,
      loading: state.messages.loading,
      loadedSuccess: state.messages.loadedSuccess,
      loadedFailure: state.messages.loadedFailure,
      selectedWallet
    }
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await fetch(
          `${
            process.env.REACT_APP_CHAINWATCH_API_SERVER_ENDPOINT
          }/api/v0/messages/${selectedWallet.address}?page=${index || 0}`
        )
        const { data, links, status } = await result.json()
        if (status === 'success') {
          dispatch(fetchedConfirmedMessagesSuccess(data, links))
        } else if (status === 'failed') {
          dispatch(
            fetchedConfirmedMessagesFailure(
              new Error('Failed to fetch data: ', JSON.stringify(data))
            )
          )
        }
      } catch (err) {
        dispatch(fetchedConfirmedMessagesFailure(err))
      }
    }
    if (
      selectedWallet.address &&
      !loading &&
      !loadedSuccess &&
      !loadedFailure
    ) {
      dispatch(fetchingConfirmedMessages())
      fetchData()
    }
  }, [
    selectedWallet.address,
    index,
    dispatch,
    loading,
    loadedSuccess,
    loadedFailure
  ])

  return {
    confirmed,
    links,
    loading,
    loadedSuccess,
    loadedFailure,
    pending
  }
}

export const useError = () =>
  useSelector(state => {
    return {
      error: state.error
    }
  })

export const useProgress = () => {
  const dispatch = useDispatch()
  const setProgress = useCallback(
    async progress => {
      dispatch(updateProgress(progress))
    },
    [dispatch]
  )
  const progress = useSelector(state => state.progress)
  return { progress, setProgress }
}

export const useCachedMessages = () => {
  const dispatch = useDispatch()
  const selectedWalletAddress = useSelector(state => {
    return (
      state.wallets.length > state.selectedWalletIdx &&
      state.wallets[state.selectedWalletIdx].address
    )
  })

  useEffect(() => {
    const pendingMessages = getMsgsFromCache(selectedWalletAddress)
    dispatch(populateRedux(pendingMessages))
  }, [dispatch, selectedWalletAddress])
}

export const useNetwork = () => {
  const dispatch = useDispatch()
  const networkFromRdx = useSelector(state => state.network)
  const params = new URLSearchParams(useLocation().search)
  const network = params.get('network')
  if (
    network &&
    network.toLowerCase() !== networkFromRdx &&
    (network.toLowerCase() === 'f' || network.toLowerCase() === 't')
  ) {
    dispatch(switchNetwork(network))
  }
}

export const useBrowserChecker = () => {
  const history = useHistory()
  useEffect(() => {
    const onValidBrowser = isValidBrowser()
    if (!onValidBrowser) history.replace('/error/bad-browser')
  }, [history])
}